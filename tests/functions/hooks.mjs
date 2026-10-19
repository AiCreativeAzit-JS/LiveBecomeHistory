export async function resolve(spec, ctx, next){
  if(spec==='npm:@supabase/supabase-js@2') return { url: new URL('./mock-sb.mjs', import.meta.url).href, shortCircuit:true };
  return next(spec, ctx);
}
