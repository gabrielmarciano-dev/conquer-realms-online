
-- ENUMS
create type public.game_status as enum ('lobby','active','finished');
create type public.terr_type as enum ('city','farm','industry','energy','plain','mountain');
create type public.diplo_status as enum ('neutral','war','alliance','peace_offer','alliance_offer');

-- PROFILES
create table public.profiles (
  id uuid primary key,
  username text not null,
  color text not null default '#5b8def',
  level int not null default 1,
  xp int not null default 0,
  matches int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  points int not null default 0,
  achievements text[] not null default '{}',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- GAMES
create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_id uuid not null,
  max_players int not null default 4,
  map text not null default 'continental',
  mode text not null default 'domination',
  password text,
  status public.game_status not null default 'lobby',
  speed int not null default 1,
  clock_minutes int not null default 0,
  last_tick timestamptz not null default now(),
  winner_id uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
grant select, insert, update, delete on public.games to authenticated;
grant all on public.games to service_role;
alter table public.games enable row level security;
create policy "games readable" on public.games for select to authenticated using (true);
create policy "games insert own" on public.games for insert to authenticated with check (auth.uid() = host_id);
create policy "games host update" on public.games for update to authenticated using (auth.uid() = host_id) with check (auth.uid() = host_id);
create policy "games host delete" on public.games for delete to authenticated using (auth.uid() = host_id);

-- GAME PLAYERS
create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null,
  username text not null,
  color text not null,
  nation text not null default 'Nação',
  is_ready boolean not null default false,
  money numeric not null default 1000,
  food numeric not null default 500,
  metal numeric not null default 300,
  energy numeric not null default 200,
  score int not null default 0,
  troops_killed int not null default 0,
  eliminated boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (game_id, user_id)
);
create index on public.game_players(game_id);
grant select, insert, update, delete on public.game_players to authenticated;
grant all on public.game_players to service_role;
alter table public.game_players enable row level security;
create policy "gp readable" on public.game_players for select to authenticated using (true);
create policy "gp insert own" on public.game_players for insert to authenticated with check (auth.uid() = user_id);
create policy "gp update own" on public.game_players for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gp delete own" on public.game_players for delete to authenticated using (auth.uid() = user_id);

-- TERRITORIES
create table public.territories (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  idx int not null,
  name text not null,
  ttype public.terr_type not null default 'plain',
  owner_player_id uuid references public.game_players(id) on delete set null,
  infantry int not null default 0,
  tanks int not null default 0,
  artillery int not null default 0,
  buildings jsonb not null default '{}'::jsonb,
  is_capital boolean not null default false,
  x numeric not null,
  y numeric not null,
  neighbors int[] not null default '{}',
  unique (game_id, idx)
);
create index on public.territories(game_id);
grant select on public.territories to authenticated;
grant all on public.territories to service_role;
alter table public.territories enable row level security;
create policy "terr readable" on public.territories for select to authenticated using (true);

-- MESSAGES
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null,
  username text not null,
  color text not null default '#ffffff',
  channel text not null default 'all',
  content text not null,
  created_at timestamptz not null default now()
);
create index on public.messages(game_id, created_at);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "msg readable" on public.messages for select to authenticated using (true);
create policy "msg insert own" on public.messages for insert to authenticated with check (auth.uid() = user_id);

-- DIPLOMACY
create table public.diplomacy (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  from_player uuid not null references public.game_players(id) on delete cascade,
  to_player uuid not null references public.game_players(id) on delete cascade,
  status public.diplo_status not null default 'neutral',
  updated_at timestamptz not null default now(),
  unique (game_id, from_player, to_player)
);
create index on public.diplomacy(game_id);
grant select on public.diplomacy to authenticated;
grant all on public.diplomacy to service_role;
alter table public.diplomacy enable row level security;
create policy "dip readable" on public.diplomacy for select to authenticated using (true);

-- REALTIME
alter table public.games replica identity full;
alter table public.game_players replica identity full;
alter table public.territories replica identity full;
alter table public.messages replica identity full;
alter table public.diplomacy replica identity full;
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.territories;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.diplomacy;

-- HELPERS
create or replace function public.my_player(p_game uuid)
returns public.game_players language sql stable security definer set search_path = public as $$
  select * from public.game_players where game_id = p_game and user_id = auth.uid() limit 1;
$$;

-- START GAME (generates map)
create or replace function public.rpc_start_game(p_game uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  g public.games;
  cols int := 8; rows_n int := 5; total int := 40;
  i int; r int; c int; nb int[]; t public.terr_type; nm text;
  pl record; k int; start_idxs int[] := '{}'; pick int; n_players int;
  names text[] := array['Ardhal','Bryn','Corvo','Dunmar','Eiran','Ferro','Grisal','Halvern','Ilmar','Joran','Kaldor','Lumen','Morvane','Norsk','Orvo','Pyrra','Quinar','Ravena','Solmar','Tavros','Ulmar','Veyra','Wardis','Xarel','Ysera','Zorin','Aldrin','Belvar','Cindra','Draven','Elmir','Fenwick','Gorvath','Hesper','Irinya','Jaddar','Kestrel','Lorath','Myrra','Nurath'];
begin
  select * into g from public.games where id = p_game;
  if g is null then raise exception 'Partida não encontrada'; end if;
  if g.host_id <> auth.uid() then raise exception 'Apenas o anfitrião pode iniciar'; end if;
  if g.status <> 'lobby' then raise exception 'Partida já iniciada'; end if;
  select count(*) into n_players from public.game_players where game_id = p_game;
  if n_players < 2 then raise exception 'São necessários pelo menos 2 jogadores'; end if;

  for i in 0..total-1 loop
    r := i / cols; c := i % cols;
    nb := '{}';
    if c > 0 then nb := nb || (i-1); end if;
    if c < cols-1 then nb := nb || (i+1); end if;
    if r > 0 then nb := nb || (i-cols); end if;
    if r < rows_n-1 then nb := nb || (i+cols); end if;
    t := (array['city','farm','industry','energy','plain','plain','mountain','farm'])[1 + (abs(hashtext(p_game::text || i::text)) % 8)]::public.terr_type;
    nm := names[i+1];
    insert into public.territories(game_id, idx, name, ttype, x, y, neighbors, infantry)
    values (p_game, i, nm, t,
      c * 12.0 + 6 + ((abs(hashtext(p_game::text || 'x' || i::text)) % 40) / 10.0) - 2,
      r * 18.0 + 10 + ((abs(hashtext(p_game::text || 'y' || i::text)) % 60) / 10.0) - 3,
      nb, 3 + (abs(hashtext(p_game::text || 'n' || i::text)) % 5));
  end loop;

  k := 0;
  for pl in select * from public.game_players where game_id = p_game order by joined_at loop
    pick := (k * (total / greatest(n_players,1))) + 3;
    if pick > total-1 then pick := total-1; end if;
    while pick = any(start_idxs) loop pick := pick + 1; end loop;
    start_idxs := start_idxs || pick;
    update public.territories
      set owner_player_id = pl.id, infantry = 20, tanks = 2, artillery = 1, is_capital = true,
          buildings = '{"barracks":true}'::jsonb
      where game_id = p_game and idx = pick;
    k := k + 1;
  end loop;

  update public.games set status = 'active', started_at = now(), last_tick = now() where id = p_game;
end; $$;

-- TICK: resource production + clock
create or replace function public.rpc_tick(p_game uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.games; mins numeric;
begin
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

-- VICTORY CHECK
create or replace function public.check_victory(p_game uuid)
returns void language plpgsql security definer set search_path = public as $$
declare total int; rec record;
begin
  select count(*) into total from public.territories where game_id = p_game;
  update public.game_players gp set eliminated = true
    where gp.game_id = p_game and gp.eliminated = false
    and not exists (select 1 from public.territories t where t.game_id = p_game and t.owner_player_id = gp.id);

  update public.game_players gp set score = c.cnt * 10
    from (select owner_player_id, count(*) cnt from public.territories where game_id = p_game group by owner_player_id) c
    where gp.id = c.owner_player_id;

  select owner_player_id, count(*) cnt into rec from public.territories
    where game_id = p_game and owner_player_id is not null
    group by owner_player_id order by count(*) desc limit 1;

  if rec.owner_player_id is not null and total > 0 and rec.cnt::numeric / total >= 0.7 then
    perform public.finish_game(p_game, rec.owner_player_id);
    return;
  end if;
  if (select count(*) from public.game_players where game_id = p_game and eliminated = false) = 1
     and (select count(*) from public.game_players where game_id = p_game) > 1 then
    perform public.finish_game(p_game, (select id from public.game_players where game_id = p_game and eliminated = false));
  end if;
end; $$;

create or replace function public.finish_game(p_game uuid, p_winner uuid)
returns void language plpgsql security definer set search_path = public as $$
declare pl record; rank_i int := 0;
begin
  if (select status from public.games where id = p_game) = 'finished' then return; end if;
  update public.games set status = 'finished', finished_at = now(), winner_id = p_winner where id = p_game;
  for pl in select gp.*, (select count(*) from public.territories t where t.owner_player_id = gp.id) terr
            from public.game_players gp where gp.game_id = p_game order by terr desc, gp.score desc loop
    rank_i := rank_i + 1;
    update public.profiles set
      matches = matches + 1,
      wins = wins + (case when pl.id = p_winner then 1 else 0 end),
      losses = losses + (case when pl.id = p_winner then 0 else 1 end),
      xp = xp + 50 + (case when pl.id = p_winner then 100 else 0 end),
      level = 1 + ((xp + 50 + (case when pl.id = p_winner then 100 else 0 end)) / 500),
      points = points + (case when pl.id = p_winner then 100 when rank_i = 2 then 60 when rank_i = 3 then 40 else 10 end),
      achievements = (case when pl.id = p_winner then array(select distinct unnest(achievements || array['Primeira Vitória'])) else achievements end)
      where id = pl.user_id;
  end loop;
end; $$;

-- RECRUIT
create or replace function public.rpc_recruit(p_terr uuid, p_unit text, p_qty int)
returns void language plpgsql security definer set search_path = public as $$
declare t public.territories; me public.game_players; cm numeric; cf numeric; cmt numeric; ce numeric;
begin
  if p_qty < 1 then raise exception 'Quantidade inválida'; end if;
  select * into t from public.territories where id = p_terr;
  select * into me from public.game_players where id = t.owner_player_id;
  if me is null or me.user_id <> auth.uid() then raise exception 'Território não é seu'; end if;
  perform public.rpc_tick(t.game_id);
  select * into me from public.game_players where id = t.owner_player_id;

  if p_unit = 'infantry' then
    if not (t.buildings ? 'barracks') then raise exception 'Necessário Quartel'; end if;
    cm := 100*p_qty; cf := 20*p_qty; cmt := 0; ce := 0;
  elsif p_unit = 'tank' then
    if not (t.buildings ? 'factory') then raise exception 'Necessária Fábrica'; end if;
    cm := 300*p_qty; cf := 20*p_qty; cmt := 80*p_qty; ce := 40*p_qty;
  elsif p_unit = 'artillery' then
    if not (t.buildings ? 'workshop') then raise exception 'Necessária Oficina'; end if;
    cm := 250*p_qty; cf := 15*p_qty; cmt := 60*p_qty; ce := 20*p_qty;
  else raise exception 'Unidade inválida'; end if;

  if me.money < cm or me.food < cf or me.metal < cmt or me.energy < ce then raise exception 'Recursos insuficientes'; end if;
  update public.game_players set money = money-cm, food = food-cf, metal = metal-cmt, energy = energy-ce where id = me.id;
  if p_unit = 'infantry' then update public.territories set infantry = infantry + p_qty where id = p_terr;
  elsif p_unit = 'tank' then update public.territories set tanks = tanks + p_qty where id = p_terr;
  else update public.territories set artillery = artillery + p_qty where id = p_terr; end if;
end; $$;

-- BUILD
create or replace function public.rpc_build(p_terr uuid, p_building text)
returns void language plpgsql security definer set search_path = public as $$
declare t public.territories; me public.game_players; cm numeric; cmt numeric;
begin
  select * into t from public.territories where id = p_terr;
  select * into me from public.game_players where id = t.owner_player_id;
  if me is null or me.user_id <> auth.uid() then raise exception 'Território não é seu'; end if;
  perform public.rpc_tick(t.game_id);
  select * into me from public.game_players where id = t.owner_player_id;

  if p_building = 'barracks' then cm := 300; cmt := 50;
  elsif p_building = 'factory' then cm := 800; cmt := 250;
  elsif p_building = 'workshop' then cm := 600; cmt := 180;
  elsif p_building = 'wall' then cm := 500; cmt := 200;
  elsif p_building = 'econ' then cm := 700; cmt := 120;
  else raise exception 'Construção inválida'; end if;

  if t.buildings ? p_building and p_building <> 'wall' then raise exception 'Já construído'; end if;
  if coalesce((t.buildings->>'wall')::int,0) >= 3 and p_building = 'wall' then raise exception 'Muralha no nível máximo'; end if;
  if me.money < cm or me.metal < cmt then raise exception 'Recursos insuficientes'; end if;

  update public.game_players set money = money-cm, metal = metal-cmt where id = me.id;
  if p_building = 'wall' then
    update public.territories set buildings = buildings || jsonb_build_object('wall', coalesce((buildings->>'wall')::int,0)+1) where id = p_terr;
  else
    update public.territories set buildings = buildings || jsonb_build_object(p_building, true) where id = p_terr;
  end if;
end; $$;

-- MOVE
create or replace function public.rpc_move(p_from uuid, p_to uuid, p_inf int, p_tank int, p_art int)
returns void language plpgsql security definer set search_path = public as $$
declare a public.territories; b public.territories; me public.game_players;
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
  update public.territories set infantry = infantry-p_inf, tanks = tanks-p_tank, artillery = artillery-p_art where id = p_from;
  update public.territories set infantry = infantry+p_inf, tanks = tanks+p_tank, artillery = artillery+p_art where id = p_to;
end; $$;

-- ATTACK
create or replace function public.rpc_attack(p_from uuid, p_to uuid, p_inf int, p_tank int, p_art int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.territories; b public.territories; me public.game_players;
  atk numeric; def numeric; wall int; roll numeric; ratio numeric; won boolean;
  loss_att numeric; loss_def numeric; li int; lt int; la int; killed int;
begin
  select * into a from public.territories where id = p_from;
  select * into b from public.territories where id = p_to;
  if a is null or b is null or a.game_id <> b.game_id then raise exception 'Territórios inválidos'; end if;
  select * into me from public.game_players where id = a.owner_player_id;
  if me is null or me.user_id <> auth.uid() then raise exception 'Território de origem não é seu'; end if;
  if b.owner_player_id = a.owner_player_id then raise exception 'Território já é seu'; end if;
  if not (b.idx = any(a.neighbors)) then raise exception 'Territórios não são vizinhos'; end if;
  if a.infantry < p_inf or a.tanks < p_tank or a.artillery < p_art then raise exception 'Tropas insuficientes'; end if;
  if p_inf+p_tank+p_art = 0 then raise exception 'Envie ao menos uma unidade'; end if;

  perform public.rpc_tick(a.game_id);

  atk := p_inf*1.0 + p_tank*3.5 + p_art*2.5;
  wall := coalesce((b.buildings->>'wall')::int, 0);
  def := b.infantry*1.2 + b.tanks*3.0 + b.artillery*1.5;
  def := def * (1 + wall*0.25) * (case when b.ttype = 'mountain' then 1.3 when b.ttype='city' then 1.15 else 1.0 end);
  if def = 0 then def := 0.5; end if;
  roll := 0.85 + random()*0.3;
  ratio := (atk * roll) / (def + atk * roll);
  won := (atk * roll) > def;

  loss_att := case when won then 0.35 + (1-ratio)*0.5 else 0.7 + random()*0.3 end;
  loss_def := case when won then 1.0 else 0.4 + ratio*0.5 end;
  if loss_att > 1 then loss_att := 1; end if;
  if loss_def > 1 then loss_def := 1; end if;

  li := floor(p_inf * loss_att); lt := floor(p_tank * loss_att); la := floor(p_art * loss_att);
  killed := floor((b.infantry + b.tanks + b.artillery) * loss_def);

  update public.territories set infantry = infantry - p_inf, tanks = tanks - p_tank, artillery = artillery - p_art where id = p_from;

  if won then
    update public.territories set
      owner_player_id = a.owner_player_id,
      infantry = greatest(p_inf - li, 0), tanks = greatest(p_tank - lt, 0), artillery = greatest(p_art - la, 0),
      is_capital = false,
      buildings = case when b.buildings ? 'wall' then b.buildings - 'wall' else b.buildings end
      where id = p_to;
  else
    update public.territories set
      infantry = greatest(floor(infantry * (1-loss_def))::int, 0),
      tanks = greatest(floor(tanks * (1-loss_def))::int, 0),
      artillery = greatest(floor(artillery * (1-loss_def))::int, 0)
      where id = p_to;
    update public.territories set
      infantry = infantry + greatest(p_inf - li,0), tanks = tanks + greatest(p_tank - lt,0), artillery = artillery + greatest(p_art - la,0)
      where id = p_from;
  end if;

  update public.game_players set troops_killed = troops_killed + killed where id = a.owner_player_id;
  perform public.check_victory(a.game_id);
  return jsonb_build_object('won', won, 'attacker_losses', li+lt+la, 'defender_losses', killed);
end; $$;

-- DIPLOMACY
create or replace function public.rpc_diplomacy(p_game uuid, p_target uuid, p_status public.diplo_status)
returns void language plpgsql security definer set search_path = public as $$
declare me public.game_players;
begin
  select * into me from public.game_players where game_id = p_game and user_id = auth.uid();
  if me is null then raise exception 'Você não está nesta partida'; end if;
  insert into public.diplomacy(game_id, from_player, to_player, status)
  values (p_game, me.id, p_target, p_status)
  on conflict (game_id, from_player, to_player) do update set status = excluded.status, updated_at = now();

  if p_status in ('war','neutral') then
    insert into public.diplomacy(game_id, from_player, to_player, status)
    values (p_game, p_target, me.id, p_status)
    on conflict (game_id, from_player, to_player) do update set status = excluded.status, updated_at = now();
  end if;

  if p_status = 'alliance' then
    if exists (select 1 from public.diplomacy where game_id = p_game and from_player = p_target and to_player = me.id and status in ('alliance_offer','alliance')) then
      update public.diplomacy set status = 'alliance' where game_id = p_game and ((from_player = me.id and to_player = p_target) or (from_player = p_target and to_player = me.id));
    else
      update public.diplomacy set status = 'alliance_offer' where game_id = p_game and from_player = me.id and to_player = p_target;
    end if;
  end if;
end; $$;

grant execute on function public.rpc_start_game(uuid) to authenticated;
grant execute on function public.rpc_tick(uuid) to authenticated;
grant execute on function public.rpc_recruit(uuid,text,int) to authenticated;
grant execute on function public.rpc_build(uuid,text) to authenticated;
grant execute on function public.rpc_move(uuid,uuid,int,int,int) to authenticated;
grant execute on function public.rpc_attack(uuid,uuid,int,int,int) to authenticated;
grant execute on function public.rpc_diplomacy(uuid,uuid,public.diplo_status) to authenticated;
