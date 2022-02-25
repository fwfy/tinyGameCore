console.log("hello from tinyGameCore.js");

// tinygamecore, a tiny core for games written in JavaScript
//
// by fwfy - www.fwfy.club

var tinyGameCore = {
    resize: true,
    running: false,
    showColliders: false,
    colorOnCollision: false,
    keymap: new Set(),
    keyActions: {},
    globalOffsetX:0,
    globalOffsetY:0,
    sprites: [],
    width: 0,
    height: 0,
    ctx: null,
    collisionBlacklist: ["shrapnel","blood","drifter"],
    particles: 0,
    particleLimit: 800,
    drawMode: 1,
    camOffsetX: 0,
    camOffsetY: 0,
    maxFPS: 120,
    fpsTrack: 0,
    fps: 0,
    logFPS: false,
    speedLimit: 500
};

class tgc_entity {
    constructor(type,x=0,y=0,w=10,h=10,cep=false,color,maxAge) {
        // console.log("got maxage",maxAge,"for sprite type",type)
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.xv = 0;
        this.yv = 0;
        this.canExitPlayfield = cep;
        this.color = color || "#FFFFFF";
        this.type = type || "entity";
        this.age = 0;
        this.maxAge = maxAge || -1;
        this.doM = this.type !== "entity";
        this.inbCollidingObjects = [];
        this.collidingObjects = [];
        this.collisionWhitelist = [];
    }
    momentum(friction,move) {
        this.age++;
        if(this.age === this.maxAge) this.destroy();
        this.xv *= friction;
        this.yv *= friction;
        if(this.xv > tinyGameCore.speedLimit) this.xv = tinyGameCore.speedLimit;
	if(this.xv < -tinyGameCore.speedLimit) this.xv = -tinyGameCore.speedLimit;
	if(this.xv > tinyGameCore.speedLimit) this.yv = tinyGameCore.speedLimit;
	if(this.xv < -tinyGameCore.speedLimit) this.yv = -tinyGameCore.speedLimit;
	
        if(move) {
            this.x += this.xv;
            this.y += this.yv;
        }
    }
    momentumWithBounds(friction,move,collides=true) {
        this.oldX = this.x;
        this.oldY = this.y;
        this.momentum(friction,move);
        if(!this.doM) return;
        if(collides) {
            this.collidingObjects = tinyGameCore.collidingWithAll(this).concat(this.inbCollidingObjects);
            this.inbCollidingObjects = [];
            if(!this.canExitPlayfield && !tinyGameCore.isInsidePlayfield(this)) {
                this.x = this.oldX;
                this.y = this.oldY;
                this.momentum(friction,false);
            }
        }
    }
    destroy() {
        tinyGameCore.sprites.splice(tinyGameCore.sprites.indexOf(this),1);
    }
}

class tgc_player extends tgc_entity {
    constructor(x=0,y=0,w=10,h=10,speed,health) {
        super("player",x,y,w,h);
        this.health = health||100;
        this.speed = speed || 1;
        this.color = "#FF66FF";
    }
    phys(friction,move) {
        if(this.health <= 0) {
            if(tinyGameCore.onGameOver) tinyGameCore.onGameOver();
            this.destroy();
        }
        this.oX = this.x;
        this.oY = this.y;
        super.momentumWithBounds(friction,move);
        if(this.collidingObjects.length !== 0) {
            this.x = this.oX;
            this.y = this.oY;
            this.collidingObjects.forEach(e => {
                if(e.doM) e.inbCollidingObjects.push(this);
            });
        }
    }
}

class tgc_particle extends tgc_entity {
    constructor(x=0,y=0,w=10,h=10,color,maxAge,xv,yv,to) {
        super(to||"particle",x,y,w,h,true,color,maxAge);
        if(tinyGameCore.particles > tinyGameCore.particleLimit) this.destroy();
        this.collides = false;
        this.xv = xv || 0;
        this.yv = yv || 0;
        this.isParticle = true;
        tinyGameCore.particles++;
    }
    phys(friction,move) {
        if(tinyGameCore.keymap.has("p")) {
            this.destroy();
        }
        super.momentumWithBounds(friction,move);
    }
}

class tgc_shrapnel extends tgc_particle {
    constructor(x,y,w,h,ma,color="white") {
        super(x,y,w,h,color,ma||2,randRecoil()*randRecoil()*5,randRecoil()*randRecoil()*5,"shrapnel");
    }
}

class tgc_blood extends tgc_particle {
    constructor(x,y,w,h,ma,color="red") {
        super(x,y,w,h,color,ma||2,randRecoil()*randRecoil()*5,randRecoil()*randRecoil()*5,"blood");
    }
}

class tgc_drifter extends tgc_entity {
    constructor(x,y,w,h) {
        super("drifter",x,y,w,h,false,"green");
        this.xs = 0;
        this.ys = 0;
        this.cap = 0.5;
        this.speed = 0.01;
        this.dying = false;
        this.collisionWhitelist = ["shrapnel","drifter"];
    }
    phys(friction,move) {
        this.x < tinyGameCore.player.x ? this.xs += this.speed : this.xs -= this.speed;
        this.y < tinyGameCore.player.y ? this.ys += this.speed : this.ys -= this.speed;
        if(this.ys > this.cap) this.ys = this.cap;
        if(this.ys < -this.cap) this.ys = -this.cap;
        if(this.xs > this.cap) this.xs = this.cap;
        if(this.xs < -this.cap) this.xs = -this.cap;
        
        this.xv += this.xs;
        this.yv += this.ys;
        super.momentumWithBounds(friction,move);
        if(tinyGameCore.isCollidingRect(this.x,this.y,this.w,this.h,tinyGameCore.player.x,tinyGameCore.player.y,tinyGameCore.player.w,tinyGameCore.player.h)) {
            this.xv *= -10;
            this.yv *= -10;
            this.xs *= -1;
            this.ys *= -1;
        }
        if(Math.abs(this.xv) > 50 || Math.abs(this.yv) > 50) {
            this.die();
        }
        if(tinyGameCore.keymap.has("k")) {
            this.die();
        }
        this.collidingObjects.forEach(e => {
            if(e.type == "shrapnel") {
                this.die();
            } else if(e.type != "player") {
                this.xv *= -10;
                this.yv *= -10;
                this.xs *= -1;
                this.ys *= -1;
            }
        });
    }
    die() {
        if(this.dying) return;
        this.dying = true;
        tinyGameCore.rumble(0.25);
        this.destroy();
        for(this.i=0;this.i<50;this.i++) {
            tinyGameCore.sprites.push(new tgc_blood(this.x,this.y,5,5,this.i+1*5,"darkred"));
        }
    }
}

class tgc_pbomb extends tgc_entity {
    constructor(x=0,y=0,w=10,h=10,shards) {
        super("explosive",x,y,w,h);
        this.color = `rgb(0,100,100)`;
        this.shards = shards;
        // console.log("this pbomb gets " + this.shards + " shards");
        this.exploded = false;
        this.collisionWhitelist = ["shrapnel","drifter"];
    }
    phys(friction,move) {
        if(!this.collidedLast) this.collidedLast = [];
        this.oX = this.x;
        this.oY = this.y;
        super.momentumWithBounds(friction,move);
        this.collidingObjects.forEach(e => {
            if(e.type === "player" || e.type === "drifter" || e.type === "shrapnel") {
                this.xv = e.xv*5;
                this.yv = e.yv*5;
                e.xv *= -2;
                e.yv *= -2;
                if(this.exploded) return;
                this.exploded = true;
                for(this.i=0;this.i<4;this.i++) {
                    setTimeout(_=>{
                        for(this.i=0;this.i<this.shards;this.i++) {
                            tinyGameCore.sprites.push(new tgc_shrapnel(this.x,this.y,5,5,100+(5*this.i)));
                            // console.log("erecting a shrapnel")
                        }
                        this.maxAge = this.age+2;
                        tinyGameCore.rumble();
                    },2000);
                }
                this.color = `rgb(255,100,100)`;
            } else if(e.type === "box") {
                e.xv += this.xv;
                e.yv += this.yv;
                super.momentumWithBounds(friction,move);
                if(this.collidedLast.indexOf(e) !== -1 && tinyGameCore.isCollidingRect(e.x,e.y,e.w,e.h,this.x,this.y,this.w,this.h)) {
                    // console.log("me stuck :(");
                    this.x = this.ooX;
                    this.y = this.ooY;
                }
                this.collidedLast = this.collidingObjects;
            } else {
                this.x = this.oX;
                this.y = this.oY;
            }
        });
        this.ooX = this.x;
        this.ooY = this.y;
    }
}

class tgc_movebox extends tgc_entity {
    constructor(x=0,y=0,w=10,h=10) {
        super("box",x,y,w,h);
        this.color = "brown";
    }
    phys(friction,move) {
        if(!this.collidedLast) this.collidedLast = [];
        this.oX = this.x;
        this.oY = this.y;
        super.momentumWithBounds(friction,move);
        this.collidingObjects.forEach(e => {
            if(e.type === "player" || e.type === "explosive") {
                this.xv = e.xv*2;
                this.yv = e.yv*2;
                e.xv *= -2;
                e.yv *= -2;
            } else if(e.type === "box") {
                e.xv += this.xv;
                e.yv += this.yv;
                super.momentumWithBounds(friction,move);
                if(this.collidedLast.indexOf(e) !== -1 && tinyGameCore.isCollidingRect(e.x,e.y,e.w,e.h,this.x,this.y,this.w,this.h)) {
                    //console.log("me stuck :(");
                    this.x = this.ooX;
                    this.y = this.ooY;
                }
                this.collidedLast = this.collidingObjects;
            } else {
                this.x = this.oX;
                this.y = this.oY;
            }
        });
        this.ooX = this.x;
        this.ooY = this.y;
    }
}

randRecoil = _ => {
    return Number(Math.random().toString().substr(-1))-5;
}

tinyGameCore.collidingWithAll = ent => {
    let r = [];
    tinyGameCore.sprites.forEach(e => {
        // ignore sprites that are far away
        distance = Math.sqrt(Math.pow(e.x-ent.x,2)+Math.pow(e.y-ent.y,2));
        if(distance > Math.sqrt(Math.pow(e.h+ent.h,2)+Math.pow(e.w+ent.w,2))) {
            return // console.log("too far away ("+distance+")");
        }
        // ignore blacklisted sprites (and particles)
        if((ent.isParticle || tinyGameCore.collisionBlacklist.includes(e.type)) && !ent.collisionWhitelist.includes(e.type)) {
            return;
        }
        // ignore self
        if(e === ent) {
            return;
        }
        //console.log("checking collision with "+e.type+" and "+ent.type);
        if(window.throwCollisions) throw "collision";
        if(tinyGameCore.isCollidingRect(e.x,e.y,e.w,e.h,ent.x,ent.y,ent.w,ent.h) && e !== ent) {
            r.push(e);
        }
    });
    return r;
}

tinyGameCore.transparentRect = (x,y,w,h,a,c) => {
    if(!tinyGameCore.ctx) {
        console.warn("Couldn't draw transparentRect because tinyGameCore.ctx is unset.");
        return;
    }
    let oC = tinyGameCore.ctx.strokeStyle;
    let oA = tinyGameCore.ctx.globalAlpha;
    tinyGameCore.ctx.strokeStyle = c;
    tinyGameCore.ctx.globalAlpha = a;
    tinyGameCore.ctx.strokeRect(x,y,w,h);
    tinyGameCore.ctx.globalAlpha = oA;
    tinyGameCore.ctx.strokeStyle = oC;
}

tinyGameCore.transparentLine = (x1,y1,x2,y2,a,c) => {
    let oC = tinyGameCore.ctx.strokeStyle;
    let oA = tinyGameCore.ctx.globalAlpha;
    tinyGameCore.ctx.strokeStyle = c;
    tinyGameCore.ctx.globalAlpha = a;
    tinyGameCore.ctx.beginPath();
    tinyGameCore.ctx.moveTo(x1, y1);
    tinyGameCore.ctx.lineTo(x2, y2);
    tinyGameCore.ctx.stroke();
    tinyGameCore.ctx.globalAlpha = oA;
    tinyGameCore.ctx.strokeStyle = oC;
}

tinyGameCore.isCollidingRect = (ax,ay,aw,ah,bx,by,bw,bh) => {
    if(tinyGameCore.showColliders == true) {
        tinyGameCore.transparentRect(ax,ay,aw,ah,1,"#00FF00");
        tinyGameCore.transparentRect(bx,by,bw,bh,1,"#00FF00");
        tinyGameCore.transparentLine(ax+(aw/2),ay+(ah/2),bx+(bw/2),by+(bh/2),1,"#0000FF");
    }
    if (ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by) {
        if(tinyGameCore.colorOnCollision) {
            oC = tinyGameCore.ctx.fillStyle;
            tinyGameCore.ctx.fillStyle = "#FFFF00";
            tinyGameCore.ctx.fillRect(ax,ay,aw,ah);
            tinyGameCore.ctx.fillStyle = oC;
        }
        return true;
    } else {
        return false;
    }
}

tinyGameCore.isInsidePlayfield = (obj) => {
    oCC = tinyGameCore.colorOnCollision;
    tinyGameCore.colorOnCollision = false;
    ret = tinyGameCore.isCollidingRect(obj.w,obj.h,tinyGameCore.ctx.canvas.clientWidth-(obj.w*2),tinyGameCore.ctx.canvas.clientHeight-(obj.h*2),obj.x,obj.y,obj.w,obj.h);
    tinyGameCore.colorOnCollision = oCC;
    return ret;
}

tinyGameCore.sprites = [new tgc_player(10,10,16,16)];
tinyGameCore.player = tinyGameCore.sprites[0];
tinyGameCore.taskFrame = false;

tinyGameCore.renderSprites = (ctx=tinyGameCore.ctx) => {
    if(tinyGameCore.taskFrame) {
        if(tinyGameCore.resize) {
            ctx.canvas.width = window.innerWidth;
            ctx.canvas.height = window.innerHeight;
        }
        tinyGameCore.particles = 0;
        tinyGameCore.sprites.forEach(e => {
            if(e.isParticle) tinyGameCore.particles++;
        });
    }
    tinyGameCore.taskFrame = !tinyGameCore.taskFrame;
    ctx.fillStyle = "black";
    ctx.fillRect(0,0,ctx.canvas.clientWidth,ctx.canvas.clientHeight);
    tinyGameCore.sprites.forEach(s => {
        ctx.fillStyle = s.color;
        if(tinyGameCore.drawMode == 1) {
            ctx.fillRect(s.x+tinyGameCore.camOffsetX,s.y+tinyGameCore.camOffsetY,s.w,s.h);
        } else if(tinyGameCore.drawMode == 2) {
            tinyGameCore.transparentRect(s.x+tinyGameCore.camOffsetX,s.y+tinyGameCore.camOffsetY,s.w,s.h,1,s.color);
        }
    });
}

tinyGameCore.keymap = new Set();

document.onkeydown = e => {
    tinyGameCore.keymap.add(e.key.toLowerCase());
    //console.log(tinyGameCore.keymap)
}

document.onkeyup = e => {
    tinyGameCore.keymap.delete(e.key.toLowerCase());
    //console.log(tinyGameCore.keymap)
}

tinyGameCore.keyActions = {
    "w": {
        "fn": () => {
            tinyGameCore.player.yv -= tinyGameCore.player.speed;
        }
    },
    "a": {
        "fn": () => {
            tinyGameCore.player.xv -= tinyGameCore.player.speed;
        }
    },
    "s": {
        "fn": () => {
            tinyGameCore.player.yv += tinyGameCore.player.speed;
        }
    },
    "d": {
        "fn": () => {
            tinyGameCore.player.xv += tinyGameCore.player.speed;
        }
    }
};

tinyGameCore.processKeys = _ => {
	Object.keys(tinyGameCore.keyActions).forEach(e => {
		// console.log(e)
		if(tinyGameCore.keymap.has(e)) {
            tinyGameCore.keyActions[e].fn();
			if(tinyGameCore.keyActions[e].singlefire) {
                tinyGameCore.keymap.delete(e);
            }
		}
	});
}

tinyGameCore.doPhysicsAll = _ => {
    tinyGameCore.sprites.forEach(e => {
        if(e.phys) {
            e.phys(0.80,true);
        } else if(e.momentumWithBounds) {
            e.momentumWithBounds(0.90,true);
        }
    });
}

tinyGameCore.rumble = (lvl=1) => {
    for(let i = 0; i < 50; i++) {
        setTimeout(_=>{
            tinyGameCore.camOffsetX = randRecoil()*lvl;
            tinyGameCore.camOffsetY = randRecoil()*lvl;
        },i*10);
    }
    setTimeout(_=>{
        tinyGameCore.camOffsetX = 0;
        tinyGameCore.camOffsetY = 0;
    },500);
}

tinyGameCore.update = _ => {
    tinyGameCore.processKeys();
    tinyGameCore.renderSprites();
    tinyGameCore.doPhysicsAll();
    tinyGameCore.fpsTrack++;
}

tinyGameCore.useCanvas = c => {
    tinyGameCore.ctx = document.getElementById(c).getContext("2d");
}

tinyGameCore.start = _ => {
    tinyGameCore.update();
    setInterval(_=>{
        tinyGameCore.fps = tinyGameCore.fpsTrack;
        tinyGameCore.fpsTrack = 0;
        if(tinyGameCore.logFPS) console.log("FPS:",tinyGameCore.fps);
    },1000);
    tinyGameCore.interval = setInterval(tinyGameCore.update,1000/tinyGameCore.maxFPS);
    tinyGameCore.running = true;
}


tinyGameCore.stop = _ => {
    clearInterval(tinyGameCore.interval);
    tinyGameCore.running = false;
}
