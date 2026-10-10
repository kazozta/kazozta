import {identity,json} from '../_lib.js';
export async function onRequest({request,env}){try{return json({user:await identity(request,env)});}catch(e){return e instanceof Response?e:json({error:'Access verification failed'},503)}}
