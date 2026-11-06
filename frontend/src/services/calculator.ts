const steps: [number,string][]=[[9000,'1 HP'],[12000,'1.5 HP'],[18000,'2 HP'],[24000,'2.5 HP'],[28000,'3 HP'],[36000,'4 HP'],[48000,'5 HP']];
export function compute({area,height=1,sun=1,people=2,room='ngu',hours=8}:{area:number;height?:number;sun?:number;people?:number;room?:string;hours?:number}) {
  const multiplier:Record<string,number>={ngu:1,khach:1.05,vanphong:1.15,kinhdoanh:1.3};
  const btu=Math.round((area*600*height*sun*(multiplier[room] || 1)+Math.max(0,people-2)*500)/100)*100;
  const selected=steps.find(([value])=>value>=btu*.95);const units=selected?1:Math.ceil(btu/48000);
  const [capacity,hp]=selected || steps.find(([value])=>value>=btu/units*.95) || steps[steps.length-1];
  const costInv=Math.round(capacity/12000*.82*units*.8*hours*30*3000/1000)*1000;
  const costStd=Math.round(capacity/12000*1.1*units*hours*30*3000/1000)*1000;
  return {btu,hp,units,costInv,costStd};
}
