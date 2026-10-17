import {isAdmin,privateJson} from '../../server/admin';
export const onRequestGet: PagesFunction<{ADMIN_PASSWORD:string}> = async ({request,env}) =>
  privateJson({admin: await isAdmin(request,env)});
