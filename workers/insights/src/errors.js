export class HttpError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
export function assert(condition,message,status=400){
  if(!condition)throw new HttpError(status,message);
}
