export function canView(required:readonly string[],allowed:ReadonlySet<string>):boolean{return required.every(id=>allowed.has(id));}
