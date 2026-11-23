const TILE=16,W=320,H=192;
const walkable=(x,y)=>y>=1&&y<=4&&x>=7&&x<=12||y>=5&&y<=7&&x>=9&&x<=10||y>=8&&y<=10&&x>=6&&x<=13;

export class Summit {
  constructor(canvas,onNear){
    this.canvas=canvas;canvas.width=W;canvas.height=H;this.ctx=canvas.getContext('2d');
    this.onNear=onNear;this.enabled=false;this.reset();
    this.land=document.createElement('canvas');this.land.width=W;this.land.height=H;
    this.paintMap(this.land.getContext('2d'));
    this.frame=requestAnimationFrame(t=>this.draw(t));
  }
  reset(){this.player={x:10,y:9,face:'up',fromX:10,fromY:9,moved:0};this.onNear?.(false);}
  near(){return Math.abs(this.player.x-10)+Math.abs(this.player.y-2)<=1;}
  move(direction){
    const p=this.player,[dx,dy]={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[direction]||[0,0];
    p.face=direction;
    const x=p.x+dx,y=p.y+dy;
    if(!walkable(x,y)||(x===10&&y===2))return false;
    p.fromX=p.x;p.fromY=p.y;p.x=x;p.y=y;p.moved=performance.now();this.onNear?.(this.near());return true;
  }
  async approach(wait){
    const p=this.player,queue=[[p.x,p.y,[]]],seen=new Set();
    while(queue.length){
      const [x,y,path]=queue.shift(),key=`${x},${y}`;if(seen.has(key))continue;seen.add(key);
      if(x===10&&y===3){for(const dir of path){this.move(dir);await wait(125);}p.face='up';return;}
      for(const [d,dx,dy] of [['up',0,-1],['left',-1,0],['right',1,0],['down',0,1]]){
        if(walkable(x+dx,y+dy)&&!(x+dx===10&&y+dy===2))queue.push([x+dx,y+dy,[...path,d]]);
      }
    }
  }
  paintMap(c){
    c.fillStyle='#7f929b';c.fillRect(0,0,W,H);
    for(let i=0;i<22;i++){c.fillStyle=i%2?'#879ba0':'#748b96';c.fillRect((i*67)%320,(i*31)%192,55,3);}
    // Stepped, hand-drawn tile cliffs and a narrow stairway to the summit.
    for(let y=1;y<12;y++)for(let x=0;x<20;x++){
      const inside=y<5?x>=7&&x<=12:y<8?x>=8&&x<=11:x>=5&&x<=14;
      if(!inside)continue;
      const px=x*TILE,py=y*TILE;
      const path=walkable(x,y);
      c.fillStyle=path?'#cfab7c':'#9a694f';c.fillRect(px,py,TILE,TILE);
      c.fillStyle=path?'#dcbc8e':'#bd8a61';c.fillRect(px+1,py+1,14,5);
      c.fillStyle=path?'#bb946b':'#875b48';c.fillRect(px+2,py+13,12,2);
      if(!path){c.fillStyle='#a87454';c.fillRect(px+3,py+7,3,5);c.fillStyle='#d2a574';c.fillRect(px+10,py+7,3,3);}
      else{c.fillStyle='#b8956b';c.fillRect(px+(x*5+y*3)%12+1,py+(x*3+y*7)%12+1,2,1);}
    }
    c.strokeStyle='#7e5e48';c.lineWidth=2;c.strokeRect(112,16,96,64);
    c.strokeStyle='#ead1a0';c.strokeRect(114,18,92,60);
    for(let y=5;y<=7;y++){
      c.fillStyle='#b8a27a';c.fillRect(146,y*16,28,16);
      for(let k=0;k<4;k++){c.fillStyle='#705e49';c.fillRect(148,y*16+k*4,24,1);c.fillStyle='#e2cf99';c.fillRect(148,y*16+k*4+1,24,2);}
      c.fillStyle='#78694f';c.fillRect(145,y*16,2,16);c.fillRect(173,y*16,2,16);
    }
    // Small weathered summit markers and scattered stone chips.
    for(const [x,y]of [[121,26],[193,26],[103,145],[214,147]]){
      c.fillStyle='#796b5d';c.fillRect(x,y,7,10);c.fillStyle='#bbb299';c.fillRect(x+1,y,5,3);
    }
    c.fillStyle='#e7c99a';c.fillRect(145,37,30,1);c.fillRect(143,41,34,1);
  }
  trainer(c,x,y,blue=false,face='down',step=0){
    x=Math.round(x);y=Math.round(y);
    c.fillStyle='#52626e55';c.fillRect(x-6,y+10,13,3);
    const outline='#343743',skin='#edba8a',shirt=blue?'#545780':'#d34749';
    c.fillStyle=outline;c.fillRect(x-5,y-10,10,4);c.fillRect(x-6,y-7,12,9);c.fillRect(x-5,y+1,10,9);
    c.fillStyle=blue?'#ad8753':'#e24949';c.fillRect(x-4,y-10,8,5);c.fillRect(x-6,y-6,12,2);
    c.fillStyle=blue?'#c4a16c':'#eee6c0';c.fillRect(x-3,y-9,6,2);
    c.fillStyle=skin;c.fillRect(x-4,y-4,8,5);
    c.fillStyle=outline;if(face==='down'){c.fillRect(x-3,y-3,1,1);c.fillRect(x+2,y-3,1,1);}else if(face==='left')c.fillRect(x-4,y-3,1,1);else if(face==='right')c.fillRect(x+3,y-3,1,1);
    c.fillStyle=shirt;c.fillRect(x-4,y+1,8,6);c.fillStyle=blue?'#b4b0c3':'#eee3bb';c.fillRect(x-1,y+1,2,6);
    c.fillStyle=skin;c.fillRect(x-6,y+2,2,4);c.fillRect(x+4,y+2,2,4);
    c.fillStyle='#3d5366';c.fillRect(x-4,y+7,3,4+step);c.fillRect(x+1,y+7,3,4-step);
    c.fillStyle=outline;c.fillRect(x-5,y+10+step,4,2);c.fillRect(x+1,y+10-step,4,2);
    if(face==='up'){c.fillStyle=blue?'#836946':'#e24949';c.fillRect(x-4,y-7,8,5);c.fillStyle='#a7975c';c.fillRect(x-3,y+2,6,5);}
  }
  draw(time){
    if(this.enabled){
      const c=this.ctx;c.imageSmoothingEnabled=false;c.clearRect(0,0,W,H);c.drawImage(this.land,0,0);
      this.trainer(c,168,41,true);
      const p=this.player,t=Math.min(1,(time-p.moved)/115),x=(p.fromX+(p.x-p.fromX)*t)*16+8,y=(p.fromY+(p.y-p.fromY)*t)*16+9;
      this.trainer(c,x,y,false,p.face,t<1?Math.sin(t*Math.PI*2)*1.5:0);
      c.fillStyle='#f6f4d5';for(let i=0;i<28;i++){const x=((i*53+time*.006)%W),y=((i*37+time*.013)%H);c.fillRect(Math.floor(x),Math.floor(y),i%4===0?2:1,1);}
      c.fillStyle='#d7e0d123';c.fillRect(0,150+Math.sin(time*.0003)*15,W,15);
    }
    this.frame=requestAnimationFrame(t=>this.draw(t));
  }
}
