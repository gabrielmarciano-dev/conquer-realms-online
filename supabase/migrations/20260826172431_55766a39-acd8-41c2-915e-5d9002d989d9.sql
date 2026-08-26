
revoke execute on all functions in schema public from public, anon;
revoke execute on function public.check_victory(uuid) from authenticated;
revoke execute on function public.finish_game(uuid,uuid) from authenticated;
revoke execute on function public.my_player(uuid) from authenticated;
grant execute on function public.rpc_start_game(uuid) to authenticated;
grant execute on function public.rpc_tick(uuid) to authenticated;
grant execute on function public.rpc_recruit(uuid,text,int) to authenticated;
grant execute on function public.rpc_build(uuid,text) to authenticated;
grant execute on function public.rpc_move(uuid,uuid,int,int,int) to authenticated;
grant execute on function public.rpc_attack(uuid,uuid,int,int,int) to authenticated;
grant execute on function public.rpc_diplomacy(uuid,uuid,public.diplo_status) to authenticated;
