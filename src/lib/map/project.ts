type Point={id:string;lat:number;lon:number};
export function projectMap(points:Point[]):{groups:{ids:string[];x:number;y:number}[];bounds:{west:number;east:number;south:number;north:number}}{
 if(!points.length)return {groups:[],bounds:{west:-5,east:5,south:-5,north:5}};
 const norm=(x:number)=>((x%360)+360)%360;
 const lons=[...new Set(points.map(p=>norm(p.lon)))].sort((a,b)=>a-b);
 let gap=-1,start=lons[0];for(let i=0;i<lons.length;i++){const next=i+1===lons.length?lons[0]+360:lons[i+1];if(next-lons[i]>gap){gap=next-lons[i];start=norm(next);}}
 const unwrap=(x:number)=>norm(x)<start?norm(x)+360:norm(x);
 const xs=points.map(p=>unwrap(p.lon)),ys=points.map(p=>p.lat);
 const extent=(lo:number,hi:number)=>{const span=Math.max(10,hi-lo);const center=(lo+hi)/2;return [center-span*.6,center+span*.6];};
 const [west,east]=extent(Math.min(...xs),Math.max(...xs));const [rawSouth,rawNorth]=extent(Math.min(...ys),Math.max(...ys));
 const south=Math.max(-90,rawSouth),north=Math.min(90,rawNorth);
 const coords=new Map<string,Point[]>();for(const p of points){const key=`${p.lat}:${norm(p.lon)}`;coords.set(key,[...(coords.get(key)??[]),p]);}
 return {groups:[...coords.values()].map(ps=>({ids:ps.map(p=>p.id).sort(),x:40+(unwrap(ps[0].lon)-west)/(east-west)*920,y:40+(1-(ps[0].lat-south)/(north-south))*420})),bounds:{west,east,south,north}};
}
