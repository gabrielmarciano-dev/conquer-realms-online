-- ACTION QUEUE: makes construction, recruitment and troop movement take real
-- time (scaled by games.speed) instead of resolving instantly. This is what
-- makes the 1x/2x/4x/8x speed selector actually affect the game.
create table public.action_queue (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.game_players(id) on delete cascade,
  kind text not null check (kind in ('build','recruit','move')),
  territory_id uuid not null references public.territories(id) on delete cascade,
  from_territory_id uuid references public.territories(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  complete_at timestamptz not null,
  done boolean not null default false
);
create index on public.action_queue(game_id, done, complete_at);
create index on public.action_queue(territory_id, done);
grant select on public.action_queue to authenticated;
grant all on public.action_queue to service_role;
alter table public.action_queue enable row level security;
create policy "queue readable" on public.action_queue for select to authenticated using (true);
-- no insert/update/delete grants: only SECURITY DEFINER RPCs may write here.

alter table public.action_queue replica identity full;
alter publication supabase_realtime add table public.action_queue;

-- Resolve every action whose time has come. Called from rpc_tick so it is
-- always driven by the server clock, never the browser's.
create or replace function public.rpc_process_queue(p_game uuid)
returns void language plpgsql security definer set search_path = public as $$
declare q record;
begin
  for q in
    select * from public.action_queue
    where game_id = p_game and done = false and complete_at <= now()
    order by complete_at
  loop
    if q.kind = 'build' then
      declare bkey text := q.payload->>'building';
      begin
        if bkey = 'wall' then
          update public.territories
            set buildings = buildings || jsonb_build_object('wall', coalesce((buildings->>'wall')::int,0) + 1)
            where id = q.territory_id;
        else
          update public.territories
            set buildings = buildings || jsonb_build_object(bkey, true)
            where id = q.territory_id;
        end if;
      end;
    elsif q.kind = 'recruit' then
      declare ukey text := q.payload->>'unit'; qty int := coalesce((q.payload->>'qty')::int,0);
      begin
        if ukey = 'infantry' then
          update public.territories set infantry = infantry + qty where id = q.territory_id;
        elsif ukey = 'tank' then
          update public.territories set tanks = tanks + qty where id = q.territory_id;
        elsif ukey = 'artillery' then
          update public.territories set artillery = artillery + qty where id = q.territory_id;
        end if;
      end;
    elsif q.kind = 'move' then
      -- only deliver if the destination is still owned by the sender (it may
      -- have changed hands while the troops were travelling)
      declare inf int := coalesce((q.payload->>'inf')::int,0);
                tank int := coalesce((q.payload->>'tank')::int,0);
                art int := coalesce((q.payload->>'art')::int,0);
      begin
        update public.territories
          set infantry = infantry + inf, tanks = tanks + tank, artillery = artillery + art
          where id = q.territory_id and owner_player_id = q.player_id;
      end;
    end if;
    update public.action_queue set done = true where id = q.id;
  end loop;
end; $$;

-- BUILD: charge resources immediately, queue the completion.
create or replace function public.rpc_build(p_terr uuid, p_building text)
returns void language plpgsql security definer set search_path = public as $$
declare
  t public.territories; me public.game_players; g public.games;
  cm numeric; cmt numeric; base_secs numeric;
begin
  select * into t from public.territories where id = p_terr;
  select * into me from public.game_players where id = t.owner_player_id;
  if me is null or me.user_id <> auth.uid() then raise exception 'Território não é seu'; end if;
  select * into g from public.games where id = t.game_id;
  perform public.rpc_process_queue(t.game_id);
  perform public.rpc_tick(t.game_id);
  select * into me from public.game_players where id = t.owner_player_id;
  select * into t from public.territories where id = p_terr;

  if p_building = 'barracks' then cm := 300; cmt := 50; base_secs := 30;
  elsif p_building = 'factory' then cm := 800; cmt := 250; base_secs := 60;
  elsif p_building = 'workshop' then cm := 600; cmt := 180; base_secs := 45;
  elsif p_building = 'wall' then cm := 500; cmt := 200; base_secs := 40;
  elsif p_building = 'econ' then cm := 700; cmt := 120; base_secs := 50;
  else raise exception 'Construção inválida'; end if;

  if t.buildings ? p_building and p_building <> 'wall' then raise exception 'Já construído'; end if;
  if coalesce((t.buildings->>'wall')::int,0) >= 3 and p_building = 'wall' then raise exception 'Muralha no nível máximo'; end if;
  if exists (select 1 from public.action_queue where territory_id = p_terr and kind = 'build'
             and done = false and payload->>'building' = p_building) then
    raise exception 'Já em construção';
  end if;
  if me.money < cm or me.metal < cmt then raise exception 'Recursos insuficientes'; end if;

  update public.game_players set money = money-cm, metal = metal-cmt where id = me.id;
  insert into public.action_queue(game_id, player_id, kind, territory_id, payload, complete_at)
  values (t.game_id, me.id, 'build', p_terr, jsonb_build_object('building', p_building),
          now() + (base_secs / greatest(g.speed,1)) * interval '1 second');
end; $$;

-- RECRUIT: charge resources immediately, queue the completion.
create or replace function public.rpc_recruit(p_terr uuid, p_unit text, p_qty int)
returns void language plpgsql security definer set search_path = public as $$
declare
  t public.territories; me public.game_players; g public.games;
  cm numeric; cf numeric; cmt numeric; ce numeric; per_unit_secs numeric;
begin
  if p_qty < 1 then raise exception 'Quantidade inválida'; end if;
  select * into t from public.territories where id = p_terr;
  select * into me from public.game_players where id = t.owner_player_id;
  if me is null or me.user_id <> auth.uid() then raise exception 'Território não é seu'; end if;
  select * into g from public.games where id = t.game_id;
  perform public.rpc_process_queue(t.game_id);
  perform public.rpc_tick(t.game_id);
  select * into me from public.game_players where id = t.owner_player_id;

  if p_unit = 'infantry' then
    if not (t.buildings ? 'barracks') then raise exception 'Necessário Quartel'; end if;
    cm := 100*p_qty; cf := 20*p_qty; cmt := 0; ce := 0; per_unit_secs := 4;
  elsif p_unit = 'tank' then
    if not (t.buildings ? 'factory') then raise exception 'Necessária Fábrica'; end if;
    cm := 300*p_qty; cf := 20*p_qty; cmt := 80*p_qty; ce := 40*p_qty; per_unit_secs := 10;
  elsif p_unit = 'artillery' then
    if not (t.buildings ? 'workshop') then raise exception 'Necessária Oficina'; end if;
    cm := 250*p_qty; cf := 15*p_qty; cmt := 60*p_qty; ce := 20*p_qty; per_unit_secs := 8;
  else raise exception 'Unidade inválida'; end if;

  if me.money < cm or me.food < cf or me.metal < cmt or me.energy < ce then raise exception 'Recursos insuficientes'; end if;
  update public.game_players set money = money-cm, food = food-cf, metal = metal-cmt, energy = energy-ce where id = me.id;
  insert into public.action_queue(game_id, player_id, kind, territory_id, payload, complete_at)
  values (t.game_id, me.id, 'recruit', p_terr, jsonb_build_object('unit', p_unit, 'qty', p_qty),
          now() + (per_unit_secs * p_qty / greatest(g.speed,1)) * interval '1 second');
end; $$;

-- MOVE: leave immediately, arrive after travel time (scaled by distance and speed).
create or replace function public.rpc_move(p_from uuid, p_to uuid, p_inf int, p_tank int, p_art int)
returns void language plpgsql security definer set search_path = public as $$
declare a public.territories; b public.territories; me public.game_players; g public.games; dist numeric; secs numeric;
begin
  select * into a from public.territories where id = p_from;
  select * into b from public.territories where id = p_to;
  if a is null or b is null or a.game_id <> b.game_id then raise exception 'Territórios inválidos'; end if;
  select * into me from public.game_players where id = a.owner_player_id;
  if me is null or me.user_id <> auth.uid() then raise exception 'Território de origem não é seu'; end if;
  if b.owner_player_id is distinct from a.owner_player_id then raise exception 'Destino não é seu'; end if;
  if not (b.idx = any(a.neighbors)) then raise exception 'Territórios não são vizinhos'; end if;
  if p_inf < 0 or p_tank < 0 or p_art < 0 or p_inf+p_tank+p_art = 0 then raise exception 'Quantidade inválida'; end if;
  if a.infantry < p_inf or a.tanks < p_tank or a.artillery < p_art then raise exception 'Tropas insuficientes'; end if;
  select * into g from public.games where id = a.game_id;

  update public.territories set infantry = infantry-p_inf, tanks = tanks-p_tank, artillery = artillery-p_art where id = p_from;

  dist := sqrt(power(a.x - b.x, 2) + power(a.y - b.y, 2));
  secs := (6 + dist * 0.6) / greatest(g.speed, 1);
  insert into public.action_queue(game_id, player_id, kind, territory_id, from_territory_id, payload, complete_at)
  values (a.game_id, me.id, 'move', p_to, p_from, jsonb_build_object('inf', p_inf, 'tank', p_tank, 'art', p_art),
          now() + secs * interval '1 second');
end; $$;

-- TICK now also resolves the queue first, so production/build/recruit/move
-- all share one authoritative server clock.
create or replace function public.rpc_tick(p_game uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.games; mins numeric;
begin
  perform public.rpc_process_queue(p_game);
  select * into g from public.games where id = p_game for update;
  if g is null or g.status <> 'active' then return; end if;
  mins := extract(epoch from (now() - g.last_tick)) / 60.0 * g.speed;
  if mins < 0.05 then return; end if;

  update public.game_players gp set
    money = gp.money + coalesce(p.money,0) * mins,
    food = gp.food + coalesce(p.food,0) * mins,
    metal = gp.metal + coalesce(p.metal,0) * mins,
    energy = gp.energy + coalesce(p.energy,0) * mins
  from (
    select owner_player_id,
      sum(case when ttype='city' then 25 when ttype='plain' then 6 when ttype='mountain' then 3 else 8 end
          + case when buildings ? 'econ' then 20 else 0 end) as money,
      sum(case when ttype='farm' then 20 else 4 end) as food,
      sum(case when ttype='industry' then 15 else 2 end) as metal,
      sum(case when ttype='energy' then 15 else 2 end) as energy
    from public.territories where game_id = p_game and owner_player_id is not null
    group by owner_player_id
  ) p
  where gp.id = p.owner_player_id and gp.game_id = p_game;

  update public.games set last_tick = now(), clock_minutes = clock_minutes + ceil(mins)::int where id = p_game;
  perform public.check_victory(p_game);
end; $$;

-- SPEED: centralised, validated (host-only, allowed values only) instead of
-- letting the client write games.speed directly.
create or replace function public.rpc_set_speed(p_game uuid, p_speed int)
returns void language plpgsql security definer set search_path = public as $$
declare g public.games;
begin
  if p_speed not in (1,2,4,8) then raise exception 'Velocidade inválida'; end if;
  select * into g from public.games where id = p_game;
  if g is null then raise exception 'Partida não encontrada'; end if;
  if g.host_id <> auth.uid() then raise exception 'Apenas o anfitrião pode alterar a velocidade'; end if;
  perform public.rpc_tick(p_game); -- settle production at the old speed first
  update public.games set speed = p_speed where id = p_game;
end; $$;

grant execute on function public.rpc_set_speed(uuid,int) to authenticated;
