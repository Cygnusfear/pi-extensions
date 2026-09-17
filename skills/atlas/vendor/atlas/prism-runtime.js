(()=>{var LZ="186",W9={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},g9={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},kZ=0,l6=1,VZ=2;var $7=1,BZ=2,y8=3,f8=0,bJ=1,rJ=2,E9=0,Z7=1,d6=2,u6=3,c6=4,IZ=5;var v8=100,zZ=101,AZ=102,CZ=103,PZ=104,wZ=200,_Z=201,TZ=202,SZ=203,jZ=204,yZ=205,fZ=206,vZ=207,hZ=208,bZ=209,xZ=210,gZ=211,pZ=212,mZ=213,lZ=214,dZ=0,uZ=1,cZ=2,n6=3,nZ=4,sZ=5,iZ=6,oZ=7,aZ=0,rZ=1,tZ=2,H9=0,s6=1,i6=2,o6=3,a6=4,r6=5,t6=6,e6=7;var h8=301,a9=302,m7=303,l7=304,K7=306,eZ=1000,d7=1001,JK=1002,p9=1003,QK=1004;var W7=1005;var xJ=1006,u7=1007;var r9=1008;var Y9=1009,$K=1010,ZK=1011,H7=1012,JQ=1013,m9=1014,P9=1015,F9=1016,QQ=1017,$Q=1018,b8=1020,KK=35902,WK=35899,HK=1021,YK=1022,D9=1023,t9=1026,e9=1027,XK=1028,ZQ=1029,J8=1030,KQ=1031;var WQ=1033,c7=33776,n7=33777,s7=33778,i7=33779,HQ=35840,YQ=35841,XQ=35842,UQ=35843,GQ=36196,NQ=37492,qQ=37496,EQ=37488,FQ=37489,o7=37490,DQ=37491,OQ=37808,RQ=37809,MQ=37810,LQ=37811,kQ=37812,VQ=37813,BQ=37814,IQ=37815,zQ=37816,AQ=37817,CQ=37818,PQ=37819,wQ=37820,_Q=37821,TQ=36492,SQ=36494,jQ=36495,yQ=36283,fQ=36284,a7=36285,vQ=36286;var hQ=0,UK=1,Q8="",GK="srgb",bQ="srgb-linear",xQ="linear",JJ="srgb";var NK=512,qK=513,EK=514,r7=515,FK=516,DK=517,t7=518,OK=519;var gQ="300 es",pQ=2000;function cW(J){for(let Q=J.length-1;Q>=0;--Q)if(J[Q]>=65535)return!0;return!1}function nW(J){return ArrayBuffer.isView(J)&&!(J instanceof DataView)}function Q7(J){return document.createElementNS("http://www.w3.org/1999/xhtml",J)}function RK(){let J=Q7("canvas");return J.style.display="block",J}var r$={},S8=null;function mQ(...J){let Q="THREE."+J.shift();if(S8)S8("log",Q,...J);else console.log(Q,...J)}function MK(J){let Q=J[0];if(typeof Q==="string"&&Q.startsWith("TSL:")){let $=J[1];if($&&$.isStackTrace)J[0]+=" "+$.getLocation();else J[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return J}function P0(...J){J=MK(J);let Q="THREE."+J.shift();if(S8)S8("warn",Q,...J);else{let $=J[0];if($&&$.isStackTrace)console.warn($.getError(Q));else console.warn(Q,...J)}}function S0(...J){J=MK(J);let Q="THREE."+J.shift();if(S8)S8("error",Q,...J);else{let $=J[0];if($&&$.isStackTrace)console.error($.getError(Q));else console.error(Q,...J)}}function o9(...J){let Q=J.join(" ");if(Q in r$)return;r$[Q]=!0,P0(...J)}function LK(J,Q,$){return new Promise(function(Z,K){function W(){switch(J.clientWaitSync(Q,J.SYNC_FLUSH_COMMANDS_BIT,0)){case J.WAIT_FAILED:K();break;case J.TIMEOUT_EXPIRED:setTimeout(W,$);break;default:Z()}}setTimeout(W,$)})}var kK={[0]:1,[2]:6,[4]:7,[3]:5,[1]:0,[6]:2,[7]:4,[5]:3};class O9{addEventListener(J,Q){if(this._listeners===void 0)this._listeners={};let $=this._listeners;if($[J]===void 0)$[J]=[];if($[J].indexOf(Q)===-1)$[J].push(Q)}hasEventListener(J,Q){let $=this._listeners;if($===void 0)return!1;return $[J]!==void 0&&$[J].indexOf(Q)!==-1}removeEventListener(J,Q){let $=this._listeners;if($===void 0)return;let Z=$[J];if(Z!==void 0){let K=Z.indexOf(Q);if(K!==-1)Z.splice(K,1)}}dispatchEvent(J){let Q=this._listeners;if(Q===void 0)return;let $=Q[J.type];if($!==void 0){J.target=this;let Z=$.slice(0);for(let K=0,W=Z.length;K<W;K++)Z[K].call(this,J);J.target=null}}}var CJ=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],t$=1234567,e8=Math.PI/180,j8=180/Math.PI;function x8(){let J=Math.random()*4294967295|0,Q=Math.random()*4294967295|0,$=Math.random()*4294967295|0,Z=Math.random()*4294967295|0;return(CJ[J&255]+CJ[J>>8&255]+CJ[J>>16&255]+CJ[J>>24&255]+"-"+CJ[Q&255]+CJ[Q>>8&255]+"-"+CJ[Q>>16&15|64]+CJ[Q>>24&255]+"-"+CJ[$&63|128]+CJ[$>>8&255]+"-"+CJ[$>>16&255]+CJ[$>>24&255]+CJ[Z&255]+CJ[Z>>8&255]+CJ[Z>>16&255]+CJ[Z>>24&255]).toLowerCase()}function b0(J,Q,$){return Math.max(Q,Math.min($,J))}function lQ(J,Q){return(J%Q+Q)%Q}function sW(J,Q,$,Z,K){return Z+(J-Q)*(K-Z)/($-Q)}function iW(J,Q,$){if(J!==Q)return($-J)/(Q-J);else return 0}function J7(J,Q,$){return(1-$)*J+$*Q}function oW(J,Q,$,Z){return J7(J,Q,1-Math.exp(-$*Z))}function aW(J,Q=1){return Q-Math.abs(lQ(J,Q*2)-Q)}function rW(J,Q,$){if(J<=Q)return 0;if(J>=$)return 1;return J=(J-Q)/($-Q),J*J*(3-2*J)}function tW(J,Q,$){if(J<=Q)return 0;if(J>=$)return 1;return J=(J-Q)/($-Q),J*J*J*(J*(J*6-15)+10)}function eW(J,Q){return J+Math.floor(Math.random()*(Q-J+1))}function JH(J,Q){return J+Math.random()*(Q-J)}function QH(J){return J*(0.5-Math.random())}function $H(J){if(J!==void 0)t$=J;let Q=t$+=1831565813;return Q=Math.imul(Q^Q>>>15,Q|1),Q^=Q+Math.imul(Q^Q>>>7,Q|61),((Q^Q>>>14)>>>0)/4294967296}function ZH(J){return J*e8}function KH(J){return J*j8}function WH(J){return J>0&&Number.isInteger(J)&&2**Math.round(Math.log2(J))===J}function HH(J){return Math.pow(2,Math.ceil(Math.log(J)/Math.LN2))}function YH(J){return Math.pow(2,Math.floor(Math.log(J)/Math.LN2))}function XH(J,Q,$,Z,K){let{cos:W,sin:H}=Math,Y=W($/2),X=H($/2),U=W((Q+Z)/2),N=H((Q+Z)/2),q=W((Q-Z)/2),G=H((Q-Z)/2),D=W((Z-Q)/2),M=H((Z-Q)/2);switch(K){case"XYX":J.set(Y*N,X*q,X*G,Y*U);break;case"YZY":J.set(X*G,Y*N,X*q,Y*U);break;case"ZXZ":J.set(X*q,X*G,Y*N,Y*U);break;case"XZX":J.set(Y*N,X*M,X*D,Y*U);break;case"YXY":J.set(X*D,Y*N,X*M,Y*U);break;case"ZYZ":J.set(X*M,X*D,Y*N,Y*U);break;default:P0("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+K)}}function w8(J,Q){switch(Q.constructor){case Float32Array:return J;case Uint32Array:return J/4294967295;case Uint16Array:return J/65535;case Uint8Array:case Uint8ClampedArray:return J/255;case Int32Array:return Math.max(J/2147483647,-1);case Int16Array:return Math.max(J/32767,-1);case Int8Array:return Math.max(J/127,-1);default:throw Error("THREE.MathUtils: Invalid component type.")}}function yJ(J,Q){switch(Q.constructor){case Float32Array:return J;case Uint32Array:return Math.round(J*4294967295);case Uint16Array:return Math.round(J*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(J*255);case Int32Array:return Math.round(J*2147483647);case Int16Array:return Math.round(J*32767);case Int8Array:return Math.round(J*127);default:throw Error("THREE.MathUtils: Invalid component type.")}}var dQ={DEG2RAD:e8,RAD2DEG:j8,generateUUID:x8,clamp:b0,euclideanModulo:lQ,mapLinear:sW,inverseLerp:iW,lerp:J7,damp:oW,pingpong:aW,smoothstep:rW,smootherstep:tW,randInt:eW,randFloat:JH,randFloatSpread:QH,seededRandom:$H,degToRad:ZH,radToDeg:KH,isPowerOfTwo:WH,ceilPowerOfTwo:HH,floorPowerOfTwo:YH,setQuaternionFromProperEuler:XH,normalize:yJ,denormalize:w8};class w0{static{w0.prototype.isVector2=!0}constructor(J=0,Q=0){this.x=J,this.y=Q}get width(){return this.x}set width(J){this.x=J}get height(){return this.y}set height(J){this.y=J}set(J,Q){return this.x=J,this.y=Q,this}setScalar(J){return this.x=J,this.y=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;default:throw Error("THREE.Vector2: index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;default:throw Error("THREE.Vector2: index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y)}copy(J){return this.x=J.x,this.y=J.y,this}add(J){return this.x+=J.x,this.y+=J.y,this}addScalar(J){return this.x+=J,this.y+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this}subScalar(J){return this.x-=J,this.y-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this}multiply(J){return this.x*=J.x,this.y*=J.y,this}multiplyScalar(J){return this.x*=J,this.y*=J,this}divide(J){return this.x/=J.x,this.y/=J.y,this}divideScalar(J){return this.multiplyScalar(1/J)}applyMatrix3(J){let Q=this.x,$=this.y,Z=J.elements;return this.x=Z[0]*Q+Z[3]*$+Z[6],this.y=Z[1]*Q+Z[4]*$+Z[7],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this}clamp(J,Q){return this.x=b0(this.x,J.x,Q.x),this.y=b0(this.y,J.y,Q.y),this}clampScalar(J,Q){return this.x=b0(this.x,J,Q),this.y=b0(this.y,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(b0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(J){return this.x*J.x+this.y*J.y}cross(J){return this.x*J.y-this.y*J.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(J){let Q=Math.sqrt(this.lengthSq()*J.lengthSq());if(Q===0)return Math.PI/2;let $=this.dot(J)/Q;return Math.acos(b0($,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let Q=this.x-J.x,$=this.y-J.y;return Q*Q+$*$}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this}equals(J){return J.x===this.x&&J.y===this.y}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this}rotateAround(J,Q){let $=Math.cos(Q),Z=Math.sin(Q),K=this.x-J.x,W=this.y-J.y;return this.x=K*$-W*Z+J.x,this.y=K*Z+W*$+J.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class tJ{constructor(J=0,Q=0,$=0,Z=1){this.isQuaternion=!0,this._x=J,this._y=Q,this._z=$,this._w=Z}static slerpFlat(J,Q,$,Z,K,W,H){let Y=$[Z+0],X=$[Z+1],U=$[Z+2],N=$[Z+3],q=K[W+0],G=K[W+1],D=K[W+2],M=K[W+3];if(N!==M||Y!==q||X!==G||U!==D){let I=Y*q+X*G+U*D+N*M;if(I<0)q=-q,G=-G,D=-D,M=-M,I=-I;let F=1-H;if(I<0.9995){let E=Math.acos(I),A=Math.sin(E);F=Math.sin(F*E)/A,H=Math.sin(H*E)/A,Y=Y*F+q*H,X=X*F+G*H,U=U*F+D*H,N=N*F+M*H}else{Y=Y*F+q*H,X=X*F+G*H,U=U*F+D*H,N=N*F+M*H;let E=1/Math.sqrt(Y*Y+X*X+U*U+N*N);Y*=E,X*=E,U*=E,N*=E}}J[Q]=Y,J[Q+1]=X,J[Q+2]=U,J[Q+3]=N}static multiplyQuaternionsFlat(J,Q,$,Z,K,W){let H=$[Z],Y=$[Z+1],X=$[Z+2],U=$[Z+3],N=K[W],q=K[W+1],G=K[W+2],D=K[W+3];return J[Q]=H*D+U*N+Y*G-X*q,J[Q+1]=Y*D+U*q+X*N-H*G,J[Q+2]=X*D+U*G+H*q-Y*N,J[Q+3]=U*D-H*N-Y*q-X*G,J}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get w(){return this._w}set w(J){this._w=J,this._onChangeCallback()}set(J,Q,$,Z){return this._x=J,this._y=Q,this._z=$,this._w=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(J){return this._x=J.x,this._y=J.y,this._z=J.z,this._w=J.w,this._onChangeCallback(),this}setFromEuler(J,Q=!0){let{_x:$,_y:Z,_z:K,_order:W}=J,H=Math.cos,Y=Math.sin,X=H($/2),U=H(Z/2),N=H(K/2),q=Y($/2),G=Y(Z/2),D=Y(K/2);switch(W){case"XYZ":this._x=q*U*N+X*G*D,this._y=X*G*N-q*U*D,this._z=X*U*D+q*G*N,this._w=X*U*N-q*G*D;break;case"YXZ":this._x=q*U*N+X*G*D,this._y=X*G*N-q*U*D,this._z=X*U*D-q*G*N,this._w=X*U*N+q*G*D;break;case"ZXY":this._x=q*U*N-X*G*D,this._y=X*G*N+q*U*D,this._z=X*U*D+q*G*N,this._w=X*U*N-q*G*D;break;case"ZYX":this._x=q*U*N-X*G*D,this._y=X*G*N+q*U*D,this._z=X*U*D-q*G*N,this._w=X*U*N+q*G*D;break;case"YZX":this._x=q*U*N+X*G*D,this._y=X*G*N+q*U*D,this._z=X*U*D-q*G*N,this._w=X*U*N-q*G*D;break;case"XZY":this._x=q*U*N-X*G*D,this._y=X*G*N-q*U*D,this._z=X*U*D+q*G*N,this._w=X*U*N+q*G*D;break;default:P0("Quaternion: .setFromEuler() encountered an unknown order: "+W)}if(Q===!0)this._onChangeCallback();return this}setFromAxisAngle(J,Q){let $=Q/2,Z=Math.sin($);return this._x=J.x*Z,this._y=J.y*Z,this._z=J.z*Z,this._w=Math.cos($),this._onChangeCallback(),this}setFromRotationMatrix(J){let Q=J.elements,$=Q[0],Z=Q[4],K=Q[8],W=Q[1],H=Q[5],Y=Q[9],X=Q[2],U=Q[6],N=Q[10],q=$+H+N;if(q>0){let G=0.5/Math.sqrt(q+1);this._w=0.25/G,this._x=(U-Y)*G,this._y=(K-X)*G,this._z=(W-Z)*G}else if($>H&&$>N){let G=2*Math.sqrt(1+$-H-N);this._w=(U-Y)/G,this._x=0.25*G,this._y=(Z+W)/G,this._z=(K+X)/G}else if(H>N){let G=2*Math.sqrt(1+H-$-N);this._w=(K-X)/G,this._x=(Z+W)/G,this._y=0.25*G,this._z=(Y+U)/G}else{let G=2*Math.sqrt(1+N-$-H);this._w=(W-Z)/G,this._x=(K+X)/G,this._y=(Y+U)/G,this._z=0.25*G}return this._onChangeCallback(),this}setFromUnitVectors(J,Q){let $=J.dot(Q)+1;if($<0.00000001)if($=0,Math.abs(J.x)>Math.abs(J.z))this._x=-J.y,this._y=J.x,this._z=0,this._w=$;else this._x=0,this._y=-J.z,this._z=J.y,this._w=$;else this._x=J.y*Q.z-J.z*Q.y,this._y=J.z*Q.x-J.x*Q.z,this._z=J.x*Q.y-J.y*Q.x,this._w=$;return this.normalize()}angleTo(J){return 2*Math.acos(Math.abs(b0(this.dot(J),-1,1)))}rotateTowards(J,Q){let $=this.angleTo(J);if($===0)return this;let Z=Math.min(1,Q/$);return this.slerp(J,Z),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(J){return this._x*J._x+this._y*J._y+this._z*J._z+this._w*J._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let J=this.length();if(J===0)this._x=0,this._y=0,this._z=0,this._w=1;else J=1/J,this._x=this._x*J,this._y=this._y*J,this._z=this._z*J,this._w=this._w*J;return this._onChangeCallback(),this}multiply(J){return this.multiplyQuaternions(this,J)}premultiply(J){return this.multiplyQuaternions(J,this)}multiplyQuaternions(J,Q){let{_x:$,_y:Z,_z:K,_w:W}=J,H=Q._x,Y=Q._y,X=Q._z,U=Q._w;return this._x=$*U+W*H+Z*X-K*Y,this._y=Z*U+W*Y+K*H-$*X,this._z=K*U+W*X+$*Y-Z*H,this._w=W*U-$*H-Z*Y-K*X,this._onChangeCallback(),this}slerp(J,Q){let{_x:$,_y:Z,_z:K,_w:W}=J,H=this.dot(J);if(H<0)$=-$,Z=-Z,K=-K,W=-W,H=-H;let Y=1-Q;if(H<0.9995){let X=Math.acos(H),U=Math.sin(X);Y=Math.sin(Y*X)/U,Q=Math.sin(Q*X)/U,this._x=this._x*Y+$*Q,this._y=this._y*Y+Z*Q,this._z=this._z*Y+K*Q,this._w=this._w*Y+W*Q,this._onChangeCallback()}else this._x=this._x*Y+$*Q,this._y=this._y*Y+Z*Q,this._z=this._z*Y+K*Q,this._w=this._w*Y+W*Q,this.normalize();return this}slerpQuaternions(J,Q,$){return this.copy(J).slerp(Q,$)}random(){let J=2*Math.PI*Math.random(),Q=2*Math.PI*Math.random(),$=Math.random(),Z=Math.sqrt(1-$),K=Math.sqrt($);return this.set(Z*Math.sin(J),Z*Math.cos(J),K*Math.sin(Q),K*Math.cos(Q))}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._w===this._w}fromArray(J,Q=0){return this._x=J[Q],this._y=J[Q+1],this._z=J[Q+2],this._w=J[Q+3],this._onChangeCallback(),this}toArray(J=[],Q=0){return J[Q]=this._x,J[Q+1]=this._y,J[Q+2]=this._z,J[Q+3]=this._w,J}fromBufferAttribute(J,Q){return this._x=J.getX(Q),this._y=J.getY(Q),this._z=J.getZ(Q),this._w=J.getW(Q),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class f{static{f.prototype.isVector3=!0}constructor(J=0,Q=0,$=0){this.x=J,this.y=Q,this.z=$}set(J,Q,$){if($===void 0)$=this.z;return this.x=J,this.y=Q,this.z=$,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;case 2:this.z=Q;break;default:throw Error("THREE.Vector3: index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("THREE.Vector3: index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this.z=J.z+Q.z,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this.z+=J.z*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this.z=J.z-Q.z,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this}multiplyVectors(J,Q){return this.x=J.x*Q.x,this.y=J.y*Q.y,this.z=J.z*Q.z,this}applyEuler(J){return this.applyQuaternion(e$.setFromEuler(J))}applyAxisAngle(J,Q){return this.applyQuaternion(e$.setFromAxisAngle(J,Q))}applyMatrix3(J){let Q=this.x,$=this.y,Z=this.z,K=J.elements;return this.x=K[0]*Q+K[3]*$+K[6]*Z,this.y=K[1]*Q+K[4]*$+K[7]*Z,this.z=K[2]*Q+K[5]*$+K[8]*Z,this}applyNormalMatrix(J){return this.applyMatrix3(J).normalize()}applyMatrix4(J){let Q=this.x,$=this.y,Z=this.z,K=J.elements,W=1/(K[3]*Q+K[7]*$+K[11]*Z+K[15]);return this.x=(K[0]*Q+K[4]*$+K[8]*Z+K[12])*W,this.y=(K[1]*Q+K[5]*$+K[9]*Z+K[13])*W,this.z=(K[2]*Q+K[6]*$+K[10]*Z+K[14])*W,this}applyQuaternion(J){let Q=this.x,$=this.y,Z=this.z,K=J.x,W=J.y,H=J.z,Y=J.w,X=2*(W*Z-H*$),U=2*(H*Q-K*Z),N=2*(K*$-W*Q);return this.x=Q+Y*X+W*N-H*U,this.y=$+Y*U+H*X-K*N,this.z=Z+Y*N+K*U-W*X,this}project(J){return this.applyMatrix4(J.matrixWorldInverse).applyMatrix4(J.projectionMatrix)}unproject(J){return this.applyMatrix4(J.projectionMatrixInverse).applyMatrix4(J.matrixWorld)}transformDirection(J){let Q=this.x,$=this.y,Z=this.z,K=J.elements;return this.x=K[0]*Q+K[4]*$+K[8]*Z,this.y=K[1]*Q+K[5]*$+K[9]*Z,this.z=K[2]*Q+K[6]*$+K[10]*Z,this.normalize()}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this}divideScalar(J){return this.multiplyScalar(1/J)}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this}clamp(J,Q){return this.x=b0(this.x,J.x,Q.x),this.y=b0(this.y,J.y,Q.y),this.z=b0(this.z,J.z,Q.z),this}clampScalar(J,Q){return this.x=b0(this.x,J,Q),this.y=b0(this.y,J,Q),this.z=b0(this.z,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(b0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this.z+=(J.z-this.z)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this.z=J.z+(Q.z-J.z)*$,this}cross(J){return this.crossVectors(this,J)}crossVectors(J,Q){let{x:$,y:Z,z:K}=J,W=Q.x,H=Q.y,Y=Q.z;return this.x=Z*Y-K*H,this.y=K*W-$*Y,this.z=$*H-Z*W,this}projectOnVector(J){let Q=J.lengthSq();if(Q===0)return this.set(0,0,0);let $=J.dot(this)/Q;return this.copy(J).multiplyScalar($)}projectOnPlane(J){return V6.copy(this).projectOnVector(J),this.sub(V6)}reflect(J){return this.sub(V6.copy(J).multiplyScalar(2*this.dot(J)))}angleTo(J){let Q=Math.sqrt(this.lengthSq()*J.lengthSq());if(Q===0)return Math.PI/2;let $=this.dot(J)/Q;return Math.acos(b0($,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let Q=this.x-J.x,$=this.y-J.y,Z=this.z-J.z;return Q*Q+$*$+Z*Z}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)+Math.abs(this.z-J.z)}setFromSpherical(J){return this.setFromSphericalCoords(J.radius,J.phi,J.theta)}setFromSphericalCoords(J,Q,$){let Z=Math.sin(Q)*J;return this.x=Z*Math.sin($),this.y=Math.cos(Q)*J,this.z=Z*Math.cos($),this}setFromCylindrical(J){return this.setFromCylindricalCoords(J.radius,J.theta,J.y)}setFromCylindricalCoords(J,Q,$){return this.x=J*Math.sin(Q),this.y=$,this.z=J*Math.cos(Q),this}setFromMatrixPosition(J){let Q=J.elements;return this.x=Q[12],this.y=Q[13],this.z=Q[14],this}setFromMatrixScale(J){let Q=this.setFromMatrixColumn(J,0).length(),$=this.setFromMatrixColumn(J,1).length(),Z=this.setFromMatrixColumn(J,2).length();return this.x=Q,this.y=$,this.z=Z,this}setFromMatrixColumn(J,Q){return this.fromArray(J.elements,Q*4)}setFromMatrix3Column(J,Q){return this.fromArray(J.elements,Q*3)}setFromEuler(J){return this.x=J._x,this.y=J._y,this.z=J._z,this}setFromColor(J){return this.x=J.r,this.y=J.g,this.z=J.b,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this.z=J[Q+2],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J[Q+2]=this.z,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this.z=J.getZ(Q),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let J=Math.random()*Math.PI*2,Q=Math.random()*2-1,$=Math.sqrt(1-Q*Q);return this.x=$*Math.cos(J),this.y=Q,this.z=$*Math.sin(J),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}var V6=new f,e$=new tJ;class j0{static{j0.prototype.isMatrix3=!0}constructor(J,Q,$,Z,K,W,H,Y,X){if(this.elements=[1,0,0,0,1,0,0,0,1],J!==void 0)this.set(J,Q,$,Z,K,W,H,Y,X)}set(J,Q,$,Z,K,W,H,Y,X){let U=this.elements;return U[0]=J,U[1]=Z,U[2]=H,U[3]=Q,U[4]=K,U[5]=Y,U[6]=$,U[7]=W,U[8]=X,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(J){let Q=this.elements,$=J.elements;return Q[0]=$[0],Q[1]=$[1],Q[2]=$[2],Q[3]=$[3],Q[4]=$[4],Q[5]=$[5],Q[6]=$[6],Q[7]=$[7],Q[8]=$[8],this}extractBasis(J,Q,$){return J.setFromMatrix3Column(this,0),Q.setFromMatrix3Column(this,1),$.setFromMatrix3Column(this,2),this}setFromMatrix4(J){let Q=J.elements;return this.set(Q[0],Q[4],Q[8],Q[1],Q[5],Q[9],Q[2],Q[6],Q[10]),this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,Q){let $=J.elements,Z=Q.elements,K=this.elements,W=$[0],H=$[3],Y=$[6],X=$[1],U=$[4],N=$[7],q=$[2],G=$[5],D=$[8],M=Z[0],I=Z[3],F=Z[6],E=Z[1],A=Z[4],_=Z[7],V=Z[2],z=Z[5],C=Z[8];return K[0]=W*M+H*E+Y*V,K[3]=W*I+H*A+Y*z,K[6]=W*F+H*_+Y*C,K[1]=X*M+U*E+N*V,K[4]=X*I+U*A+N*z,K[7]=X*F+U*_+N*C,K[2]=q*M+G*E+D*V,K[5]=q*I+G*A+D*z,K[8]=q*F+G*_+D*C,this}multiplyScalar(J){let Q=this.elements;return Q[0]*=J,Q[3]*=J,Q[6]*=J,Q[1]*=J,Q[4]*=J,Q[7]*=J,Q[2]*=J,Q[5]*=J,Q[8]*=J,this}determinant(){let J=this.elements,Q=J[0],$=J[1],Z=J[2],K=J[3],W=J[4],H=J[5],Y=J[6],X=J[7],U=J[8];return Q*W*U-Q*H*X-$*K*U+$*H*Y+Z*K*X-Z*W*Y}invert(){let J=this.elements,Q=J[0],$=J[1],Z=J[2],K=J[3],W=J[4],H=J[5],Y=J[6],X=J[7],U=J[8],N=U*W-H*X,q=H*Y-U*K,G=X*K-W*Y,D=Q*N+$*q+Z*G;if(D===0)return this.set(0,0,0,0,0,0,0,0,0);let M=1/D;return J[0]=N*M,J[1]=(Z*X-U*$)*M,J[2]=(H*$-Z*W)*M,J[3]=q*M,J[4]=(U*Q-Z*Y)*M,J[5]=(Z*K-H*Q)*M,J[6]=G*M,J[7]=($*Y-X*Q)*M,J[8]=(W*Q-$*K)*M,this}transpose(){let J,Q=this.elements;return J=Q[1],Q[1]=Q[3],Q[3]=J,J=Q[2],Q[2]=Q[6],Q[6]=J,J=Q[5],Q[5]=Q[7],Q[7]=J,this}getNormalMatrix(J){return this.setFromMatrix4(J).invert().transpose()}transposeIntoArray(J){let Q=this.elements;return J[0]=Q[0],J[1]=Q[3],J[2]=Q[6],J[3]=Q[1],J[4]=Q[4],J[5]=Q[7],J[6]=Q[2],J[7]=Q[5],J[8]=Q[8],this}setUvTransform(J,Q,$,Z,K,W,H){let Y=Math.cos(K),X=Math.sin(K);return this.set($*Y,$*X,-$*(Y*W+X*H)+W+J,-Z*X,Z*Y,-Z*(-X*W+Y*H)+H+Q,0,0,1),this}scale(J,Q){return o9("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(B6.makeScale(J,Q)),this}rotate(J){return o9("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(B6.makeRotation(-J)),this}translate(J,Q){return o9("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(B6.makeTranslation(J,Q)),this}makeTranslation(J,Q){if(J.isVector2)this.set(1,0,J.x,0,1,J.y,0,0,1);else this.set(1,0,J,0,1,Q,0,0,1);return this}makeRotation(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,-$,0,$,Q,0,0,0,1),this}makeScale(J,Q){return this.set(J,0,0,0,Q,0,0,0,1),this}equals(J){let Q=this.elements,$=J.elements;for(let Z=0;Z<9;Z++)if(Q[Z]!==$[Z])return!1;return!0}fromArray(J,Q=0){for(let $=0;$<9;$++)this.elements[$]=J[$+Q];return this}toArray(J=[],Q=0){let $=this.elements;return J[Q]=$[0],J[Q+1]=$[1],J[Q+2]=$[2],J[Q+3]=$[3],J[Q+4]=$[4],J[Q+5]=$[5],J[Q+6]=$[6],J[Q+7]=$[7],J[Q+8]=$[8],J}clone(){return new this.constructor().fromArray(this.elements)}}var B6=new j0,JZ=new j0().set(0.4123908,0.3575843,0.1804808,0.212639,0.7151687,0.0721923,0.0193308,0.1191948,0.9505322),QZ=new j0().set(3.2409699,-1.5373832,-0.4986108,-0.9692436,1.8759675,0.0415551,0.0556301,-0.203977,1.0569715);function UH(){let J={enabled:!0,workingColorSpace:"srgb-linear",spaces:{},convert:function(K,W,H){if(this.enabled===!1||W===H||!W||!H)return K;if(this.spaces[W].transfer==="srgb")K.r=C9(K.r),K.g=C9(K.g),K.b=C9(K.b);if(this.spaces[W].primaries!==this.spaces[H].primaries)K.applyMatrix3(this.spaces[W].toXYZ),K.applyMatrix3(this.spaces[H].fromXYZ);if(this.spaces[H].transfer==="srgb")K.r=T8(K.r),K.g=T8(K.g),K.b=T8(K.b);return K},workingToColorSpace:function(K,W){return this.convert(K,this.workingColorSpace,W)},colorSpaceToWorking:function(K,W){return this.convert(K,W,this.workingColorSpace)},getPrimaries:function(K){return this.spaces[K].primaries},getTransfer:function(K){if(K==="")return"linear";return this.spaces[K].transfer},getToneMappingMode:function(K){return this.spaces[K].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(K,W=this.workingColorSpace){return K.fromArray(this.spaces[W].luminanceCoefficients)},define:function(K){Object.assign(this.spaces,K)},_getMatrix:function(K,W,H){return K.copy(this.spaces[W].toXYZ).multiply(this.spaces[H].fromXYZ)},_getDrawingBufferColorSpace:function(K){return this.spaces[K].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(K=this.workingColorSpace){return this.spaces[K].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(K,W){return o9("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),J.workingToColorSpace(K,W)},toWorkingColorSpace:function(K,W){return o9("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),J.colorSpaceToWorking(K,W)}},Q=[0.64,0.33,0.3,0.6,0.15,0.06],$=[0.2126,0.7152,0.0722],Z=[0.3127,0.329];return J.define({["srgb-linear"]:{primaries:Q,whitePoint:Z,transfer:"linear",toXYZ:JZ,fromXYZ:QZ,luminanceCoefficients:$,workingColorSpaceConfig:{unpackColorSpace:"srgb"},outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}},["srgb"]:{primaries:Q,whitePoint:Z,transfer:"srgb",toXYZ:JZ,fromXYZ:QZ,luminanceCoefficients:$,outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}}}),J}var m0=UH();function C9(J){return J<0.04045?J*0.0773993808:Math.pow(J*0.9478672986+0.0521327014,2.4)}function T8(J){return J<0.0031308?J*12.92:1.055*Math.pow(J,0.41666)-0.055}var D8;class uQ{static getDataURL(J,Q="image/png"){if(/^data:/i.test(J.src))return J.src;if(typeof HTMLCanvasElement>"u")return J.src;let $;if(J instanceof HTMLCanvasElement)$=J;else{if(D8===void 0)D8=Q7("canvas");D8.width=J.width,D8.height=J.height;let Z=D8.getContext("2d");if(J instanceof ImageData)Z.putImageData(J,0,0);else Z.drawImage(J,0,0,J.width,J.height);$=D8}return $.toDataURL(Q)}static sRGBToLinear(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap){let Q=Q7("canvas");Q.width=J.width,Q.height=J.height;let $=Q.getContext("2d");$.drawImage(J,0,0,J.width,J.height);let Z=$.getImageData(0,0,J.width,J.height),K=Z.data;for(let W=0;W<K.length;W++)K[W]=C9(K[W]/255)*255;return $.putImageData(Z,0,0),Q}else if(J.data){let Q=J.data.slice(0);for(let $=0;$<Q.length;$++)if(Q instanceof Uint8Array||Q instanceof Uint8ClampedArray)Q[$]=Math.floor(C9(Q[$]/255)*255);else Q[$]=C9(Q[$]);return{data:Q,width:J.width,height:J.height}}else return P0("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),J}}var GH=0;class Y7{constructor(J=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:GH++}),this.uuid=x8(),this.data=J,this.dataReady=!0,this.version=0}getSize(J){let Q=this.data;if(typeof HTMLVideoElement<"u"&&Q instanceof HTMLVideoElement)J.set(Q.videoWidth,Q.videoHeight,0);else if(typeof VideoFrame<"u"&&Q instanceof VideoFrame)J.set(Q.displayWidth,Q.displayHeight,0);else if(Q!==null)J.set(Q.width,Q.height,Q.depth||0);else J.set(0,0,0);return J}set needsUpdate(J){if(J===!0)this.version++}toJSON(J){let Q=J===void 0||typeof J==="string";if(!Q&&J.images[this.uuid]!==void 0)return J.images[this.uuid];let $={uuid:this.uuid,url:""},Z=this.data;if(Z!==null){let K;if(Array.isArray(Z)){K=[];for(let W=0,H=Z.length;W<H;W++)if(Z[W].isDataTexture)K.push(I6(Z[W].image));else K.push(I6(Z[W]))}else K=I6(Z);$.url=K}if(!Q)J.images[this.uuid]=$;return $}}function I6(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap)return uQ.getDataURL(J);else if(J.data)return{data:Array.from(J.data),width:J.width,height:J.height,type:J.data.constructor.name};else return P0("Texture: Unable to serialize Texture."),{}}var NH=0,z6=new f;class wJ extends O9{constructor(J=wJ.DEFAULT_IMAGE,Q=wJ.DEFAULT_MAPPING,$=1001,Z=1001,K=1006,W=1008,H=1023,Y=1009,X=wJ.DEFAULT_ANISOTROPY,U=""){super();this.isTexture=!0,Object.defineProperty(this,"id",{value:NH++}),this.uuid=x8(),this.name="",this.source=new Y7(J),this.mipmaps=[],this.mapping=Q,this.channel=0,this.wrapS=$,this.wrapT=Z,this.magFilter=K,this.minFilter=W,this.anisotropy=X,this.format=H,this.internalFormat=null,this.type=Y,this.offset=new w0(0,0),this.repeat=new w0(1,1),this.center=new w0(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new j0,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=U,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=J&&J.depth&&J.depth>1?!0:!1,this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(z6).x}get height(){return this.source.getSize(z6).y}get depth(){return this.source.getSize(z6).z}get image(){return this.source.data}set image(J){this.source.data=J}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(J){return this.name=J.name,this.source=J.source,this.mipmaps=J.mipmaps.slice(0),this.mapping=J.mapping,this.channel=J.channel,this.wrapS=J.wrapS,this.wrapT=J.wrapT,this.magFilter=J.magFilter,this.minFilter=J.minFilter,this.anisotropy=J.anisotropy,this.format=J.format,this.internalFormat=J.internalFormat,this.type=J.type,this.normalized=J.normalized,this.offset.copy(J.offset),this.repeat.copy(J.repeat),this.center.copy(J.center),this.rotation=J.rotation,this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrix.copy(J.matrix),this.generateMipmaps=J.generateMipmaps,this.premultiplyAlpha=J.premultiplyAlpha,this.flipY=J.flipY,this.unpackAlignment=J.unpackAlignment,this.colorSpace=J.colorSpace,this.renderTarget=J.renderTarget,this.isRenderTargetTexture=J.isRenderTargetTexture,this.isArrayTexture=J.isArrayTexture,this.userData=JSON.parse(JSON.stringify(J.userData)),this.needsUpdate=!0,this}setValues(J){for(let Q in J){let $=J[Q];if($===void 0){P0(`Texture.setValues(): parameter '${Q}' has value of undefined.`);continue}let Z=this[Q];if(Z===void 0){P0(`Texture.setValues(): property '${Q}' does not exist.`);continue}if(Z&&$&&(Z.isVector2&&$.isVector2))Z.copy($);else if(Z&&$&&(Z.isVector3&&$.isVector3))Z.copy($);else if(Z&&$&&(Z.isMatrix3&&$.isMatrix3))Z.copy($);else this[Q]=$}}toJSON(J){let Q=J===void 0||typeof J==="string";if(!Q&&J.textures[this.uuid]!==void 0)return J.textures[this.uuid];let $={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(J).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(Object.keys(this.userData).length>0)$.userData=this.userData;if(!Q)J.textures[this.uuid]=$;return $}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(J){if(this.mapping!==300)return J;if(J.applyMatrix3(this.matrix),J.x<0||J.x>1)switch(this.wrapS){case 1000:J.x=J.x-Math.floor(J.x);break;case 1001:J.x=J.x<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.x)%2)===1)J.x=Math.ceil(J.x)-J.x;else J.x=J.x-Math.floor(J.x);break}if(J.y<0||J.y>1)switch(this.wrapT){case 1000:J.y=J.y-Math.floor(J.y);break;case 1001:J.y=J.y<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.y)%2)===1)J.y=Math.ceil(J.y)-J.y;else J.y=J.y-Math.floor(J.y);break}if(this.flipY)J.y=1-J.y;return J}set needsUpdate(J){if(J===!0)this.version++,this.source.needsUpdate=!0}set needsPMREMUpdate(J){if(J===!0)this.pmremVersion++}}wJ.DEFAULT_IMAGE=null;wJ.DEFAULT_MAPPING=300;wJ.DEFAULT_ANISOTROPY=1;class UJ{static{UJ.prototype.isVector4=!0}constructor(J=0,Q=0,$=0,Z=1){this.x=J,this.y=Q,this.z=$,this.w=Z}get width(){return this.z}set width(J){this.z=J}get height(){return this.w}set height(J){this.w=J}set(J,Q,$,Z){return this.x=J,this.y=Q,this.z=$,this.w=Z,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this.w=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setW(J){return this.w=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;case 2:this.z=Q;break;case 3:this.w=Q;break;default:throw Error("THREE.Vector4: index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("THREE.Vector4: index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this.w=J.w!==void 0?J.w:1,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this.w+=J.w,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this.w+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this.z=J.z+Q.z,this.w=J.w+Q.w,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this.z+=J.z*Q,this.w+=J.w*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this.w-=J.w,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this.w-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this.z=J.z-Q.z,this.w=J.w-Q.w,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this.w*=J.w,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this.w*=J,this}applyMatrix4(J){let Q=this.x,$=this.y,Z=this.z,K=this.w,W=J.elements;return this.x=W[0]*Q+W[4]*$+W[8]*Z+W[12]*K,this.y=W[1]*Q+W[5]*$+W[9]*Z+W[13]*K,this.z=W[2]*Q+W[6]*$+W[10]*Z+W[14]*K,this.w=W[3]*Q+W[7]*$+W[11]*Z+W[15]*K,this}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this.w/=J.w,this}divideScalar(J){return this.multiplyScalar(1/J)}setAxisAngleFromQuaternion(J){this.w=2*Math.acos(J.w);let Q=Math.sqrt(1-J.w*J.w);if(Q<0.0001)this.x=1,this.y=0,this.z=0;else this.x=J.x/Q,this.y=J.y/Q,this.z=J.z/Q;return this}setAxisAngleFromRotationMatrix(J){let Q,$,Z,K,W=0.01,H=0.1,Y=J.elements,X=Y[0],U=Y[4],N=Y[8],q=Y[1],G=Y[5],D=Y[9],M=Y[2],I=Y[6],F=Y[10];if(Math.abs(U-q)<0.01&&Math.abs(N-M)<0.01&&Math.abs(D-I)<0.01){if(Math.abs(U+q)<0.1&&Math.abs(N+M)<0.1&&Math.abs(D+I)<0.1&&Math.abs(X+G+F-3)<0.1)return this.set(1,0,0,0),this;Q=Math.PI;let A=(X+1)/2,_=(G+1)/2,V=(F+1)/2,z=(U+q)/4,C=(N+M)/4,P=(D+I)/4;if(A>_&&A>V)if(A<0.01)$=0,Z=0.707106781,K=0.707106781;else $=Math.sqrt(A),Z=z/$,K=C/$;else if(_>V)if(_<0.01)$=0.707106781,Z=0,K=0.707106781;else Z=Math.sqrt(_),$=z/Z,K=P/Z;else if(V<0.01)$=0.707106781,Z=0.707106781,K=0;else K=Math.sqrt(V),$=C/K,Z=P/K;return this.set($,Z,K,Q),this}let E=Math.sqrt((I-D)*(I-D)+(N-M)*(N-M)+(q-U)*(q-U));if(Math.abs(E)<0.001)E=1;return this.x=(I-D)/E,this.y=(N-M)/E,this.z=(q-U)/E,this.w=Math.acos((X+G+F-1)/2),this}setFromMatrixPosition(J){let Q=J.elements;return this.x=Q[12],this.y=Q[13],this.z=Q[14],this.w=Q[15],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this.w=Math.min(this.w,J.w),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this.w=Math.max(this.w,J.w),this}clamp(J,Q){return this.x=b0(this.x,J.x,Q.x),this.y=b0(this.y,J.y,Q.y),this.z=b0(this.z,J.z,Q.z),this.w=b0(this.w,J.w,Q.w),this}clampScalar(J,Q){return this.x=b0(this.x,J,Q),this.y=b0(this.y,J,Q),this.z=b0(this.z,J,Q),this.w=b0(this.w,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(b0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z+this.w*J.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this.z+=(J.z-this.z)*Q,this.w+=(J.w-this.w)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this.z=J.z+(Q.z-J.z)*$,this.w=J.w+(Q.w-J.w)*$,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z&&J.w===this.w}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this.z=J[Q+2],this.w=J[Q+3],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J[Q+2]=this.z,J[Q+3]=this.w,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this.z=J.getZ(Q),this.w=J.getW(Q),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class cQ extends O9{constructor(J=1,Q=1,$={}){super();$=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},$),this.isRenderTarget=!0,this.width=J,this.height=Q,this.depth=$.depth,this.scissor=new UJ(0,0,J,Q),this.scissorTest=!1,this.viewport=new UJ(0,0,J,Q),this.textures=[];let Z={width:J,height:Q,depth:$.depth},K=new wJ(Z),W=$.count;for(let H=0;H<W;H++)this.textures[H]=K.clone(),this.textures[H].isRenderTargetTexture=!0,this.textures[H].renderTarget=this;this._setTextureOptions($),this.depthBuffer=$.depthBuffer,this.stencilBuffer=$.stencilBuffer,this.resolveColorBuffer=$.resolveColorBuffer,this.resolveDepthBuffer=$.resolveDepthBuffer,this.resolveStencilBuffer=$.resolveStencilBuffer,this.storeMultisampledColorBuffer=$.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=$.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=$.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=$.depthTexture,this.samples=$.samples,this.multiview=$.multiview,this.useArrayDepthTexture=$.useArrayDepthTexture}_setTextureOptions(J={}){let Q={minFilter:1006,generateMipmaps:!1,flipY:!1,internalFormat:null};if(J.mapping!==void 0)Q.mapping=J.mapping;if(J.wrapS!==void 0)Q.wrapS=J.wrapS;if(J.wrapT!==void 0)Q.wrapT=J.wrapT;if(J.wrapR!==void 0)Q.wrapR=J.wrapR;if(J.magFilter!==void 0)Q.magFilter=J.magFilter;if(J.minFilter!==void 0)Q.minFilter=J.minFilter;if(J.format!==void 0)Q.format=J.format;if(J.type!==void 0)Q.type=J.type;if(J.anisotropy!==void 0)Q.anisotropy=J.anisotropy;if(J.colorSpace!==void 0)Q.colorSpace=J.colorSpace;if(J.flipY!==void 0)Q.flipY=J.flipY;if(J.generateMipmaps!==void 0)Q.generateMipmaps=J.generateMipmaps;if(J.internalFormat!==void 0)Q.internalFormat=J.internalFormat;for(let $=0;$<this.textures.length;$++)this.textures[$].setValues(Q)}get texture(){return this.textures[0]}set texture(J){this.textures[0]=J}set depthTexture(J){if(this._depthTexture!==null&&this._depthTexture.renderTarget===this)this._depthTexture.renderTarget=null;if(J!==null&&J.renderTarget===null)J.renderTarget=this;this._depthTexture=J}get depthTexture(){return this._depthTexture}setSize(J,Q,$=1){if(this.width!==J||this.height!==Q||this.depth!==$){this.width=J,this.height=Q,this.depth=$;for(let Z=0,K=this.textures.length;Z<K;Z++)if(this.textures[Z].image.width=J,this.textures[Z].image.height=Q,this.textures[Z].image.depth=$,this.textures[Z].isData3DTexture!==!0)this.textures[Z].isArrayTexture=this.textures[Z].image.depth>1;this.dispose()}this.viewport.set(0,0,J,Q),this.scissor.set(0,0,J,Q)}clone(){return new this.constructor().copy(this)}copy(J){this.width=J.width,this.height=J.height,this.depth=J.depth,this.scissor.copy(J.scissor),this.scissorTest=J.scissorTest,this.viewport.copy(J.viewport),this.textures.length=0;for(let Q=0,$=J.textures.length;Q<$;Q++){this.textures[Q]=J.textures[Q].clone(),this.textures[Q].isRenderTargetTexture=!0,this.textures[Q].renderTarget=this;let Z=Object.assign({},J.textures[Q].image);this.textures[Q].source=new Y7(Z)}if(this.depthBuffer=J.depthBuffer,this.stencilBuffer=J.stencilBuffer,this.resolveColorBuffer=J.resolveColorBuffer,this.resolveDepthBuffer=J.resolveDepthBuffer,this.resolveStencilBuffer=J.resolveStencilBuffer,this.storeMultisampledColorBuffer=J.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=J.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=J.storeMultisampledStencilBuffer,J.depthTexture!==null)if(J.depthTexture.renderTarget===J){let Q=J.depthTexture.clone();Q.renderTarget=null,this.depthTexture=Q}else this.depthTexture=J.depthTexture;return this.samples=J.samples,this.multiview=J.multiview,this.useArrayDepthTexture=J.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class cJ extends cQ{constructor(J=1,Q=1,$={}){super(J,Q,$);this.isWebGLRenderTarget=!0}}class e7 extends wJ{constructor(J=null,Q=1,$=1,Z=1){super(null);this.isDataArrayTexture=!0,this.image={data:J,width:Q,height:$,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(J){return super.copy(J),this.wrapR=J.wrapR,this}addLayerUpdate(J){this.layerUpdates.add(J)}clearLayerUpdates(){this.layerUpdates.clear()}}class nQ extends wJ{constructor(J=null,Q=1,$=1,Z=1){super(null);this.isData3DTexture=!0,this.image={data:J,width:Q,height:$,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(J){return super.copy(J),this.wrapR=J.wrapR,this}}class KJ{static{KJ.prototype.isMatrix4=!0}constructor(J,Q,$,Z,K,W,H,Y,X,U,N,q,G,D,M,I){if(this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],J!==void 0)this.set(J,Q,$,Z,K,W,H,Y,X,U,N,q,G,D,M,I)}set(J,Q,$,Z,K,W,H,Y,X,U,N,q,G,D,M,I){let F=this.elements;return F[0]=J,F[4]=Q,F[8]=$,F[12]=Z,F[1]=K,F[5]=W,F[9]=H,F[13]=Y,F[2]=X,F[6]=U,F[10]=N,F[14]=q,F[3]=G,F[7]=D,F[11]=M,F[15]=I,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new KJ().fromArray(this.elements)}copy(J){let Q=this.elements,$=J.elements;return Q[0]=$[0],Q[1]=$[1],Q[2]=$[2],Q[3]=$[3],Q[4]=$[4],Q[5]=$[5],Q[6]=$[6],Q[7]=$[7],Q[8]=$[8],Q[9]=$[9],Q[10]=$[10],Q[11]=$[11],Q[12]=$[12],Q[13]=$[13],Q[14]=$[14],Q[15]=$[15],this}copyPosition(J){let Q=this.elements,$=J.elements;return Q[12]=$[12],Q[13]=$[13],Q[14]=$[14],this}setFromMatrix3(J){let Q=J.elements;return this.set(Q[0],Q[3],Q[6],0,Q[1],Q[4],Q[7],0,Q[2],Q[5],Q[8],0,0,0,0,1),this}extractBasis(J,Q,$){if(this.determinantAffine()===0)return J.set(1,0,0),Q.set(0,1,0),$.set(0,0,1),this;return J.setFromMatrixColumn(this,0),Q.setFromMatrixColumn(this,1),$.setFromMatrixColumn(this,2),this}makeBasis(J,Q,$){return this.set(J.x,Q.x,$.x,0,J.y,Q.y,$.y,0,J.z,Q.z,$.z,0,0,0,0,1),this}extractRotation(J){if(J.determinantAffine()===0)return this.identity();let Q=this.elements,$=J.elements,Z=1/O8.setFromMatrixColumn(J,0).length(),K=1/O8.setFromMatrixColumn(J,1).length(),W=1/O8.setFromMatrixColumn(J,2).length();return Q[0]=$[0]*Z,Q[1]=$[1]*Z,Q[2]=$[2]*Z,Q[3]=0,Q[4]=$[4]*K,Q[5]=$[5]*K,Q[6]=$[6]*K,Q[7]=0,Q[8]=$[8]*W,Q[9]=$[9]*W,Q[10]=$[10]*W,Q[11]=0,Q[12]=0,Q[13]=0,Q[14]=0,Q[15]=1,this}makeRotationFromEuler(J){let Q=this.elements,$=J.x,Z=J.y,K=J.z,W=Math.cos($),H=Math.sin($),Y=Math.cos(Z),X=Math.sin(Z),U=Math.cos(K),N=Math.sin(K);if(J.order==="XYZ"){let q=W*U,G=W*N,D=H*U,M=H*N;Q[0]=Y*U,Q[4]=-Y*N,Q[8]=X,Q[1]=G+D*X,Q[5]=q-M*X,Q[9]=-H*Y,Q[2]=M-q*X,Q[6]=D+G*X,Q[10]=W*Y}else if(J.order==="YXZ"){let q=Y*U,G=Y*N,D=X*U,M=X*N;Q[0]=q+M*H,Q[4]=D*H-G,Q[8]=W*X,Q[1]=W*N,Q[5]=W*U,Q[9]=-H,Q[2]=G*H-D,Q[6]=M+q*H,Q[10]=W*Y}else if(J.order==="ZXY"){let q=Y*U,G=Y*N,D=X*U,M=X*N;Q[0]=q-M*H,Q[4]=-W*N,Q[8]=D+G*H,Q[1]=G+D*H,Q[5]=W*U,Q[9]=M-q*H,Q[2]=-W*X,Q[6]=H,Q[10]=W*Y}else if(J.order==="ZYX"){let q=W*U,G=W*N,D=H*U,M=H*N;Q[0]=Y*U,Q[4]=D*X-G,Q[8]=q*X+M,Q[1]=Y*N,Q[5]=M*X+q,Q[9]=G*X-D,Q[2]=-X,Q[6]=H*Y,Q[10]=W*Y}else if(J.order==="YZX"){let q=W*Y,G=W*X,D=H*Y,M=H*X;Q[0]=Y*U,Q[4]=M-q*N,Q[8]=D*N+G,Q[1]=N,Q[5]=W*U,Q[9]=-H*U,Q[2]=-X*U,Q[6]=G*N+D,Q[10]=q-M*N}else if(J.order==="XZY"){let q=W*Y,G=W*X,D=H*Y,M=H*X;Q[0]=Y*U,Q[4]=-N,Q[8]=X*U,Q[1]=q*N+M,Q[5]=W*U,Q[9]=G*N-D,Q[2]=D*N-G,Q[6]=H*U,Q[10]=M*N+q}return Q[3]=0,Q[7]=0,Q[11]=0,Q[12]=0,Q[13]=0,Q[14]=0,Q[15]=1,this}makeRotationFromQuaternion(J){return this.compose(qH,J,EH)}lookAt(J,Q,$){let Z=this.elements;if(lJ.subVectors(J,Q),lJ.lengthSq()===0)lJ.z=1;if(lJ.normalize(),y9.crossVectors($,lJ),y9.lengthSq()===0){if(Math.abs($.z)===1)lJ.x+=0.0001;else lJ.z+=0.0001;lJ.normalize(),y9.crossVectors($,lJ)}return y9.normalize(),B7.crossVectors(lJ,y9),Z[0]=y9.x,Z[4]=B7.x,Z[8]=lJ.x,Z[1]=y9.y,Z[5]=B7.y,Z[9]=lJ.y,Z[2]=y9.z,Z[6]=B7.z,Z[10]=lJ.z,this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,Q){let $=J.elements,Z=Q.elements,K=this.elements,W=$[0],H=$[4],Y=$[8],X=$[12],U=$[1],N=$[5],q=$[9],G=$[13],D=$[2],M=$[6],I=$[10],F=$[14],E=$[3],A=$[7],_=$[11],V=$[15],z=Z[0],C=Z[4],P=Z[8],L=Z[12],B=Z[1],l=Z[5],v=Z[9],h=Z[13],r=Z[2],j=Z[6],d=Z[10],o=Z[14],m=Z[3],Q0=Z[7],c=Z[11],a=Z[15];return K[0]=W*z+H*B+Y*r+X*m,K[4]=W*C+H*l+Y*j+X*Q0,K[8]=W*P+H*v+Y*d+X*c,K[12]=W*L+H*h+Y*o+X*a,K[1]=U*z+N*B+q*r+G*m,K[5]=U*C+N*l+q*j+G*Q0,K[9]=U*P+N*v+q*d+G*c,K[13]=U*L+N*h+q*o+G*a,K[2]=D*z+M*B+I*r+F*m,K[6]=D*C+M*l+I*j+F*Q0,K[10]=D*P+M*v+I*d+F*c,K[14]=D*L+M*h+I*o+F*a,K[3]=E*z+A*B+_*r+V*m,K[7]=E*C+A*l+_*j+V*Q0,K[11]=E*P+A*v+_*d+V*c,K[15]=E*L+A*h+_*o+V*a,this}multiplyScalar(J){let Q=this.elements;return Q[0]*=J,Q[4]*=J,Q[8]*=J,Q[12]*=J,Q[1]*=J,Q[5]*=J,Q[9]*=J,Q[13]*=J,Q[2]*=J,Q[6]*=J,Q[10]*=J,Q[14]*=J,Q[3]*=J,Q[7]*=J,Q[11]*=J,Q[15]*=J,this}determinant(){let J=this.elements,Q=J[0],$=J[4],Z=J[8],K=J[12],W=J[1],H=J[5],Y=J[9],X=J[13],U=J[2],N=J[6],q=J[10],G=J[14],D=J[3],M=J[7],I=J[11],F=J[15],E=Y*G-X*q,A=H*G-X*N,_=H*q-Y*N,V=W*G-X*U,z=W*q-Y*U,C=W*N-H*U;return Q*(M*E-I*A+F*_)-$*(D*E-I*V+F*z)+Z*(D*A-M*V+F*C)-K*(D*_-M*z+I*C)}determinantAffine(){let J=this.elements,Q=J[0],$=J[4],Z=J[8],K=J[1],W=J[5],H=J[9],Y=J[2],X=J[6],U=J[10];return Q*(W*U-H*X)-$*(K*U-H*Y)+Z*(K*X-W*Y)}transpose(){let J=this.elements,Q;return Q=J[1],J[1]=J[4],J[4]=Q,Q=J[2],J[2]=J[8],J[8]=Q,Q=J[6],J[6]=J[9],J[9]=Q,Q=J[3],J[3]=J[12],J[12]=Q,Q=J[7],J[7]=J[13],J[13]=Q,Q=J[11],J[11]=J[14],J[14]=Q,this}setPosition(J,Q,$){let Z=this.elements;if(J.isVector3)Z[12]=J.x,Z[13]=J.y,Z[14]=J.z;else Z[12]=J,Z[13]=Q,Z[14]=$;return this}invert(){let J=this.elements,Q=J[0],$=J[1],Z=J[2],K=J[3],W=J[4],H=J[5],Y=J[6],X=J[7],U=J[8],N=J[9],q=J[10],G=J[11],D=J[12],M=J[13],I=J[14],F=J[15],E=Q*H-$*W,A=Q*Y-Z*W,_=Q*X-K*W,V=$*Y-Z*H,z=$*X-K*H,C=Z*X-K*Y,P=U*M-N*D,L=U*I-q*D,B=U*F-G*D,l=N*I-q*M,v=N*F-G*M,h=q*F-G*I,r=E*h-A*v+_*l+V*B-z*L+C*P;if(r===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let j=1/r;return J[0]=(H*h-Y*v+X*l)*j,J[1]=(Z*v-$*h-K*l)*j,J[2]=(M*C-I*z+F*V)*j,J[3]=(q*z-N*C-G*V)*j,J[4]=(Y*B-W*h-X*L)*j,J[5]=(Q*h-Z*B+K*L)*j,J[6]=(I*_-D*C-F*A)*j,J[7]=(U*C-q*_+G*A)*j,J[8]=(W*v-H*B+X*P)*j,J[9]=($*B-Q*v-K*P)*j,J[10]=(D*z-M*_+F*E)*j,J[11]=(N*_-U*z-G*E)*j,J[12]=(H*L-W*l-Y*P)*j,J[13]=(Q*l-$*L+Z*P)*j,J[14]=(M*A-D*V-I*E)*j,J[15]=(U*V-N*A+q*E)*j,this}scale(J){let Q=this.elements,$=J.x,Z=J.y,K=J.z;return Q[0]*=$,Q[4]*=Z,Q[8]*=K,Q[1]*=$,Q[5]*=Z,Q[9]*=K,Q[2]*=$,Q[6]*=Z,Q[10]*=K,Q[3]*=$,Q[7]*=Z,Q[11]*=K,this}getMaxScaleOnAxis(){let J=this.elements,Q=J[0]*J[0]+J[1]*J[1]+J[2]*J[2],$=J[4]*J[4]+J[5]*J[5]+J[6]*J[6],Z=J[8]*J[8]+J[9]*J[9]+J[10]*J[10];return Math.sqrt(Math.max(Q,$,Z))}makeTranslation(J,Q,$){if(J.isVector3)this.set(1,0,0,J.x,0,1,0,J.y,0,0,1,J.z,0,0,0,1);else this.set(1,0,0,J,0,1,0,Q,0,0,1,$,0,0,0,1);return this}makeRotationX(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(1,0,0,0,0,Q,-$,0,0,$,Q,0,0,0,0,1),this}makeRotationY(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,0,$,0,0,1,0,0,-$,0,Q,0,0,0,0,1),this}makeRotationZ(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,-$,0,0,$,Q,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(J,Q){let $=Math.cos(Q),Z=Math.sin(Q),K=1-$,W=J.x,H=J.y,Y=J.z,X=K*W,U=K*H;return this.set(X*W+$,X*H-Z*Y,X*Y+Z*H,0,X*H+Z*Y,U*H+$,U*Y-Z*W,0,X*Y-Z*H,U*Y+Z*W,K*Y*Y+$,0,0,0,0,1),this}makeScale(J,Q,$){return this.set(J,0,0,0,0,Q,0,0,0,0,$,0,0,0,0,1),this}makeShear(J,Q,$,Z,K,W){return this.set(1,$,K,0,J,1,W,0,Q,Z,1,0,0,0,0,1),this}compose(J,Q,$){let Z=this.elements,K=Q._x,W=Q._y,H=Q._z,Y=Q._w,X=K+K,U=W+W,N=H+H,q=K*X,G=K*U,D=K*N,M=W*U,I=W*N,F=H*N,E=Y*X,A=Y*U,_=Y*N,V=$.x,z=$.y,C=$.z;return Z[0]=(1-(M+F))*V,Z[1]=(G+_)*V,Z[2]=(D-A)*V,Z[3]=0,Z[4]=(G-_)*z,Z[5]=(1-(q+F))*z,Z[6]=(I+E)*z,Z[7]=0,Z[8]=(D+A)*C,Z[9]=(I-E)*C,Z[10]=(1-(q+M))*C,Z[11]=0,Z[12]=J.x,Z[13]=J.y,Z[14]=J.z,Z[15]=1,this}decompose(J,Q,$){let Z=this.elements;J.x=Z[12],J.y=Z[13],J.z=Z[14];let K=this.determinantAffine();if(K===0)return $.set(1,1,1),Q.identity(),this;let W=O8.set(Z[0],Z[1],Z[2]).length(),H=O8.set(Z[4],Z[5],Z[6]).length(),Y=O8.set(Z[8],Z[9],Z[10]).length();if(K<0)W=-W;Q9.copy(this);let X=1/W,U=1/H,N=1/Y;return Q9.elements[0]*=X,Q9.elements[1]*=X,Q9.elements[2]*=X,Q9.elements[4]*=U,Q9.elements[5]*=U,Q9.elements[6]*=U,Q9.elements[8]*=N,Q9.elements[9]*=N,Q9.elements[10]*=N,Q.setFromRotationMatrix(Q9),$.x=W,$.y=H,$.z=Y,this}makePerspective(J,Q,$,Z,K,W,H=2000,Y=!1){let X=this.elements,U=2*K/(Q-J),N=2*K/($-Z),q=(Q+J)/(Q-J),G=($+Z)/($-Z),D,M;if(Y)D=K/(W-K),M=W*K/(W-K);else if(H===2000)D=-(W+K)/(W-K),M=-2*W*K/(W-K);else if(H===2001)D=-W/(W-K),M=-W*K/(W-K);else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+H);return X[0]=U,X[4]=0,X[8]=q,X[12]=0,X[1]=0,X[5]=N,X[9]=G,X[13]=0,X[2]=0,X[6]=0,X[10]=D,X[14]=M,X[3]=0,X[7]=0,X[11]=-1,X[15]=0,this}makeOrthographic(J,Q,$,Z,K,W,H=2000,Y=!1){let X=this.elements,U=2/(Q-J),N=2/($-Z),q=-(Q+J)/(Q-J),G=-($+Z)/($-Z),D,M;if(Y)D=1/(W-K),M=W/(W-K);else if(H===2000)D=-2/(W-K),M=-(W+K)/(W-K);else if(H===2001)D=-1/(W-K),M=-K/(W-K);else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+H);return X[0]=U,X[4]=0,X[8]=0,X[12]=q,X[1]=0,X[5]=N,X[9]=0,X[13]=G,X[2]=0,X[6]=0,X[10]=D,X[14]=M,X[3]=0,X[7]=0,X[11]=0,X[15]=1,this}equals(J){let Q=this.elements,$=J.elements;for(let Z=0;Z<16;Z++)if(Q[Z]!==$[Z])return!1;return!0}fromArray(J,Q=0){for(let $=0;$<16;$++)this.elements[$]=J[$+Q];return this}toArray(J=[],Q=0){let $=this.elements;return J[Q]=$[0],J[Q+1]=$[1],J[Q+2]=$[2],J[Q+3]=$[3],J[Q+4]=$[4],J[Q+5]=$[5],J[Q+6]=$[6],J[Q+7]=$[7],J[Q+8]=$[8],J[Q+9]=$[9],J[Q+10]=$[10],J[Q+11]=$[11],J[Q+12]=$[12],J[Q+13]=$[13],J[Q+14]=$[14],J[Q+15]=$[15],J}}var O8=new f,Q9=new KJ,qH=new f(0,0,0),EH=new f(1,1,1),y9=new f,B7=new f,lJ=new f,$Z=new KJ,ZZ=new tJ;class x9{constructor(J=0,Q=0,$=0,Z=x9.DEFAULT_ORDER){this.isEuler=!0,this._x=J,this._y=Q,this._z=$,this._order=Z}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get order(){return this._order}set order(J){this._order=J,this._onChangeCallback()}set(J,Q,$,Z=this._order){return this._x=J,this._y=Q,this._z=$,this._order=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(J){return this._x=J._x,this._y=J._y,this._z=J._z,this._order=J._order,this._onChangeCallback(),this}setFromRotationMatrix(J,Q=this._order,$=!0){let Z=J.elements,K=Z[0],W=Z[4],H=Z[8],Y=Z[1],X=Z[5],U=Z[9],N=Z[2],q=Z[6],G=Z[10];switch(Q){case"XYZ":if(this._y=Math.asin(b0(H,-1,1)),Math.abs(H)<0.9999999)this._x=Math.atan2(-U,G),this._z=Math.atan2(-W,K);else this._x=Math.atan2(q,X),this._z=0;break;case"YXZ":if(this._x=Math.asin(-b0(U,-1,1)),Math.abs(U)<0.9999999)this._y=Math.atan2(H,G),this._z=Math.atan2(Y,X);else this._y=Math.atan2(-N,K),this._z=0;break;case"ZXY":if(this._x=Math.asin(b0(q,-1,1)),Math.abs(q)<0.9999999)this._y=Math.atan2(-N,G),this._z=Math.atan2(-W,X);else this._y=0,this._z=Math.atan2(Y,K);break;case"ZYX":if(this._y=Math.asin(-b0(N,-1,1)),Math.abs(N)<0.9999999)this._x=Math.atan2(q,G),this._z=Math.atan2(Y,K);else this._x=0,this._z=Math.atan2(-W,X);break;case"YZX":if(this._z=Math.asin(b0(Y,-1,1)),Math.abs(Y)<0.9999999)this._x=Math.atan2(-U,X),this._y=Math.atan2(-N,K);else this._x=0,this._y=Math.atan2(H,G);break;case"XZY":if(this._z=Math.asin(-b0(W,-1,1)),Math.abs(W)<0.9999999)this._x=Math.atan2(q,X),this._y=Math.atan2(H,K);else this._x=Math.atan2(-U,G),this._y=0;break;default:P0("Euler: .setFromRotationMatrix() encountered an unknown order: "+Q)}if(this._order=Q,$===!0)this._onChangeCallback();return this}setFromQuaternion(J,Q,$){return $Z.makeRotationFromQuaternion(J),this.setFromRotationMatrix($Z,Q,$)}setFromVector3(J,Q=this._order){return this.set(J.x,J.y,J.z,Q)}reorder(J){return ZZ.setFromEuler(this),this.setFromQuaternion(ZZ,J)}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._order===this._order}fromArray(J){if(this._x=J[0],this._y=J[1],this._z=J[2],J[3]!==void 0)this._order=J[3];return this._onChangeCallback(),this}toArray(J=[],Q=0){return J[Q]=this._x,J[Q+1]=this._y,J[Q+2]=this._z,J[Q+3]=this._order,J}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}x9.DEFAULT_ORDER="XYZ";class X7{constructor(){this.mask=1}set(J){this.mask=(1<<J|0)>>>0}enable(J){this.mask|=1<<J|0}enableAll(){this.mask=-1}toggle(J){this.mask^=1<<J|0}disable(J){this.mask&=~(1<<J|0)}disableAll(){this.mask=0}test(J){return(this.mask&J.mask)!==0}isEnabled(J){return(this.mask&(1<<J|0))!==0}}var FH=0,KZ=new f,R8=new tJ,V9=new KJ,I7=new f,o8=new f,DH=new f,OH=new tJ,WZ=new f(1,0,0),HZ=new f(0,1,0),YZ=new f(0,0,1),XZ={type:"added"},RH={type:"removed"},M8={type:"childadded",child:null},A6={type:"childremoved",child:null};class _J extends O9{constructor(){super();this.isObject3D=!0,Object.defineProperty(this,"id",{value:FH++}),this.uuid=x8(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=_J.DEFAULT_UP.clone();let J=new f,Q=new x9,$=new tJ,Z=new f(1,1,1);function K(){$.setFromEuler(Q,!1)}function W(){Q.setFromQuaternion($,void 0,!1)}Q._onChange(K),$._onChange(W),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:J},rotation:{configurable:!0,enumerable:!0,value:Q},quaternion:{configurable:!0,enumerable:!0,value:$},scale:{configurable:!0,enumerable:!0,value:Z},modelViewMatrix:{value:new KJ},normalMatrix:{value:new j0}}),this.matrix=new KJ,this.matrixWorld=new KJ,this.matrixAutoUpdate=_J.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=_J.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new X7,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(J){if(this.matrixAutoUpdate)this.updateMatrix();this.matrix.premultiply(J),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(J){return this.quaternion.premultiply(J),this}setRotationFromAxisAngle(J,Q){this.quaternion.setFromAxisAngle(J,Q)}setRotationFromEuler(J){this.quaternion.setFromEuler(J,!0)}setRotationFromMatrix(J){this.quaternion.setFromRotationMatrix(J)}setRotationFromQuaternion(J){this.quaternion.copy(J)}rotateOnAxis(J,Q){return R8.setFromAxisAngle(J,Q),this.quaternion.multiply(R8),this}rotateOnWorldAxis(J,Q){return R8.setFromAxisAngle(J,Q),this.quaternion.premultiply(R8),this}rotateX(J){return this.rotateOnAxis(WZ,J)}rotateY(J){return this.rotateOnAxis(HZ,J)}rotateZ(J){return this.rotateOnAxis(YZ,J)}translateOnAxis(J,Q){return KZ.copy(J).applyQuaternion(this.quaternion),this.position.add(KZ.multiplyScalar(Q)),this}translateX(J){return this.translateOnAxis(WZ,J)}translateY(J){return this.translateOnAxis(HZ,J)}translateZ(J){return this.translateOnAxis(YZ,J)}localToWorld(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(this.matrixWorld)}worldToLocal(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(V9.copy(this.matrixWorld).invert())}lookAt(J,Q,$){if(J.isVector3)I7.copy(J);else I7.set(J,Q,$);let Z=this.parent;if(this.updateWorldMatrix(!0,!1),o8.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight)V9.lookAt(o8,I7,this.up);else V9.lookAt(I7,o8,this.up);if(this.quaternion.setFromRotationMatrix(V9),Z)V9.extractRotation(Z.matrixWorld),R8.setFromRotationMatrix(V9),this.quaternion.premultiply(R8.invert())}add(J){if(arguments.length>1){for(let Q=0;Q<arguments.length;Q++)this.add(arguments[Q]);return this}if(J===this)return S0("Object3D.add: object can't be added as a child of itself.",J),this;if(J&&J.isObject3D)J.removeFromParent(),J.parent=this,this.children.push(J),J.dispatchEvent(XZ),M8.child=J,this.dispatchEvent(M8),M8.child=null;else S0("Object3D.add: object not an instance of THREE.Object3D.",J);return this}remove(J){if(arguments.length>1){for(let $=0;$<arguments.length;$++)this.remove(arguments[$]);return this}let Q=this.children.indexOf(J);if(Q!==-1)J.parent=null,this.children.splice(Q,1),J.dispatchEvent(RH),A6.child=J,this.dispatchEvent(A6),A6.child=null;return this}removeFromParent(){let J=this.parent;if(J!==null)J.remove(this);return this}clear(){return this.remove(...this.children)}attach(J){if(this.updateWorldMatrix(!0,!1),V9.copy(this.matrixWorld).invert(),J.parent!==null)J.parent.updateWorldMatrix(!0,!1),V9.multiply(J.parent.matrixWorld);return J.applyMatrix4(V9),J.removeFromParent(),J.parent=this,this.children.push(J),J.updateWorldMatrix(!1,!0),J.dispatchEvent(XZ),M8.child=J,this.dispatchEvent(M8),M8.child=null,this}getObjectById(J){return this.getObjectByProperty("id",J)}getObjectByName(J){return this.getObjectByProperty("name",J)}getObjectByProperty(J,Q){if(this[J]===Q)return this;for(let $=0,Z=this.children.length;$<Z;$++){let W=this.children[$].getObjectByProperty(J,Q);if(W!==void 0)return W}return}getObjectsByProperty(J,Q,$=[]){if(this[J]===Q)$.push(this);let Z=this.children;for(let K=0,W=Z.length;K<W;K++)Z[K].getObjectsByProperty(J,Q,$);return $}getWorldPosition(J){return this.updateWorldMatrix(!0,!1),J.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(o8,J,DH),J}getWorldScale(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(o8,OH,J),J}getWorldDirection(J){this.updateWorldMatrix(!0,!1);let Q=this.matrixWorld.elements;return J.set(Q[8],Q[9],Q[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(J){J(this);let Q=this.children;for(let $=0,Z=Q.length;$<Z;$++)Q[$].traverse(J)}traverseVisible(J){if(this.visible===!1)return;J(this);let Q=this.children;for(let $=0,Z=Q.length;$<Z;$++)Q[$].traverseVisible(J)}traverseAncestors(J){let Q=this.parent;if(Q!==null)J(Q),Q.traverseAncestors(J)}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let J=this.pivot;if(J!==null){let{x:Q,y:$,z:Z}=J,K=this.matrix.elements;K[12]+=Q-K[0]*Q-K[4]*$-K[8]*Z,K[13]+=$-K[1]*Q-K[5]*$-K[9]*Z,K[14]+=Z-K[2]*Q-K[6]*$-K[10]*Z}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(J){if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||J){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,J=!0}let Q=this.children;for(let $=0,Z=Q.length;$<Z;$++)Q[$].updateMatrixWorld(J)}updateWorldMatrix(J,Q,$=!1){let Z=this.parent;if(J===!0&&Z!==null)Z.updateWorldMatrix(!0,!1);if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||$){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,$=!0}if(Q===!0){let K=this.children;for(let W=0,H=K.length;W<H;W++)K[W].updateWorldMatrix(!1,!0,$)}}toJSON(J){let Q=J===void 0||typeof J==="string",$={};if(Q)J={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},$.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"};let Z={};if(Z.uuid=this.uuid,Z.type=this.type,Z.name=this.name,Z.castShadow=this.castShadow,Z.receiveShadow=this.receiveShadow,Z.visible=this.visible,Z.frustumCulled=this.frustumCulled,Z.renderOrder=this.renderOrder,Z.static=this.static,Z.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0)Z.userData=this.userData;if(Z.layers=this.layers.mask,Z.matrix=this.matrix.toArray(),Z.up=this.up.toArray(),this.pivot!==null)Z.pivot=this.pivot.toArray();if(this.morphTargetDictionary!==void 0)Z.morphTargetDictionary=Object.assign({},this.morphTargetDictionary);if(this.morphTargetInfluences!==void 0)Z.morphTargetInfluences=this.morphTargetInfluences.slice();if(this.isInstancedMesh){if(Z.type="InstancedMesh",Z.count=this.count,Z.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null)Z.instanceColor=this.instanceColor.toJSON()}if(this.isBatchedMesh){if(Z.type="BatchedMesh",Z.perObjectFrustumCulled=this.perObjectFrustumCulled,Z.sortObjects=this.sortObjects,Z.drawRanges=this._drawRanges,Z.reservedRanges=this._reservedRanges,Z.geometryInfo=this._geometryInfo.map((H)=>({...H,boundingBox:H.boundingBox?H.boundingBox.toJSON():void 0,boundingSphere:H.boundingSphere?H.boundingSphere.toJSON():void 0})),Z.instanceInfo=this._instanceInfo.map((H)=>({...H})),Z.availableInstanceIds=this._availableInstanceIds.slice(),Z.availableGeometryIds=this._availableGeometryIds.slice(),Z.nextIndexStart=this._nextIndexStart,Z.nextVertexStart=this._nextVertexStart,Z.geometryCount=this._geometryCount,Z.maxInstanceCount=this._maxInstanceCount,Z.maxVertexCount=this._maxVertexCount,Z.maxIndexCount=this._maxIndexCount,Z.geometryInitialized=this._geometryInitialized,Z.matricesTexture=this._matricesTexture.toJSON(J),Z.indirectTexture=this._indirectTexture.toJSON(J),this._colorsTexture!==null)Z.colorsTexture=this._colorsTexture.toJSON(J);if(this.boundingSphere!==null)Z.boundingSphere=this.boundingSphere.toJSON();if(this.boundingBox!==null)Z.boundingBox=this.boundingBox.toJSON()}function K(H,Y){if(H[Y.uuid]===void 0)H[Y.uuid]=Y.toJSON(J);return Y.uuid}if(this.isScene){if(this.background){if(this.background.isColor)Z.background=this.background.toJSON();else if(this.background.isTexture)Z.background=this.background.toJSON(J).uuid}if(this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0)Z.environment=this.environment.toJSON(J).uuid}else if(this.isMesh||this.isLine||this.isPoints){Z.geometry=K(J.geometries,this.geometry);let H=this.geometry.parameters;if(H!==void 0&&H.shapes!==void 0){let Y=H.shapes;if(Array.isArray(Y))for(let X=0,U=Y.length;X<U;X++){let N=Y[X];K(J.shapes,N)}else K(J.shapes,Y)}}if(this.isSkinnedMesh){if(Z.bindMode=this.bindMode,Z.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0)K(J.skeletons,this.skeleton),Z.skeleton=this.skeleton.uuid}if(this.material!==void 0)if(Array.isArray(this.material)){let H=[];for(let Y=0,X=this.material.length;Y<X;Y++)H.push(K(J.materials,this.material[Y]));Z.material=H}else Z.material=K(J.materials,this.material);if(this.children.length>0){Z.children=[];for(let H=0;H<this.children.length;H++)Z.children.push(this.children[H].toJSON(J).object)}if(this.animations.length>0){Z.animations=[];for(let H=0;H<this.animations.length;H++){let Y=this.animations[H];Z.animations.push(K(J.animations,Y))}}if(Q){let H=W(J.geometries),Y=W(J.materials),X=W(J.textures),U=W(J.images),N=W(J.shapes),q=W(J.skeletons),G=W(J.animations),D=W(J.nodes);if(H.length>0)$.geometries=H;if(Y.length>0)$.materials=Y;if(X.length>0)$.textures=X;if(U.length>0)$.images=U;if(N.length>0)$.shapes=N;if(q.length>0)$.skeletons=q;if(G.length>0)$.animations=G;if(D.length>0)$.nodes=D}return $.object=Z,$;function W(H){let Y=[];for(let X in H){let U=H[X];delete U.metadata,Y.push(U)}return Y}}clone(J){return new this.constructor().copy(this,J)}copy(J,Q=!0){if(this.name=J.name,this.up.copy(J.up),this.position.copy(J.position),this.rotation.order=J.rotation.order,this.quaternion.copy(J.quaternion),this.scale.copy(J.scale),this.pivot=J.pivot!==null?J.pivot.clone():null,this.matrix.copy(J.matrix),this.matrixWorld.copy(J.matrixWorld),this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrixWorldAutoUpdate=J.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=J.matrixWorldNeedsUpdate,this.layers.mask=J.layers.mask,this.visible=J.visible,this.castShadow=J.castShadow,this.receiveShadow=J.receiveShadow,this.frustumCulled=J.frustumCulled,this.renderOrder=J.renderOrder,this.static=J.static,this.animations=J.animations.slice(),this.userData=JSON.parse(JSON.stringify(J.userData)),Q===!0)for(let $=0;$<J.children.length;$++){let Z=J.children[$];this.add(Z.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}_J.DEFAULT_UP=new f(0,1,0);_J.DEFAULT_MATRIX_AUTO_UPDATE=!0;_J.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class _8 extends _J{constructor(){super();this.isGroup=!0,this.type="Group"}}var MH={type:"move"};class U7{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){if(this._hand===null)this._hand=new _8,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1};return this._hand}getTargetRaySpace(){if(this._targetRay===null)this._targetRay=new _8,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new f,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new f;return this._targetRay}getGripSpace(){if(this._grip===null)this._grip=new _8,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new f,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new f,this._grip.eventsEnabled=!1;return this._grip}dispatchEvent(J){if(this._targetRay!==null)this._targetRay.dispatchEvent(J);if(this._grip!==null)this._grip.dispatchEvent(J);if(this._hand!==null)this._hand.dispatchEvent(J);return this}connect(J){if(J&&J.hand){let Q=this._hand;if(Q)for(let $ of J.hand.values())this._getHandJoint(Q,$)}return this.dispatchEvent({type:"connected",data:J}),this}disconnect(J){if(this.dispatchEvent({type:"disconnected",data:J}),this._targetRay!==null)this._targetRay.visible=!1;if(this._grip!==null)this._grip.visible=!1;if(this._hand!==null)this._hand.visible=!1;return this}update(J,Q,$){let Z=null,K=null,W=null,H=this._targetRay,Y=this._grip,X=this._hand;if(J&&Q.session.visibilityState!=="visible-blurred"){if(X&&J.hand){W=!0;for(let M of J.hand.values()){let I=Q.getJointPose(M,$),F=this._getHandJoint(X,M);if(I!==null)F.matrix.fromArray(I.transform.matrix),F.matrix.decompose(F.position,F.rotation,F.scale),F.matrixWorldNeedsUpdate=!0,F.jointRadius=I.radius;F.visible=I!==null}let U=X.joints["index-finger-tip"],N=X.joints["thumb-tip"],q=U.position.distanceTo(N.position),G=0.02,D=0.005;if(X.inputState.pinching&&q>G+D)X.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:J.handedness,target:this});else if(!X.inputState.pinching&&q<=G-D)X.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:J.handedness,target:this})}else if(Y!==null&&J.gripSpace){if(K=Q.getPose(J.gripSpace,$),K!==null){if(Y.matrix.fromArray(K.transform.matrix),Y.matrix.decompose(Y.position,Y.rotation,Y.scale),Y.matrixWorldNeedsUpdate=!0,K.linearVelocity)Y.hasLinearVelocity=!0,Y.linearVelocity.copy(K.linearVelocity);else Y.hasLinearVelocity=!1;if(K.angularVelocity)Y.hasAngularVelocity=!0,Y.angularVelocity.copy(K.angularVelocity);else Y.hasAngularVelocity=!1;if(Y.eventsEnabled)Y.dispatchEvent({type:"gripUpdated",data:J,target:this})}}if(H!==null){if(Z=Q.getPose(J.targetRaySpace,$),Z===null&&K!==null)Z=K;if(Z!==null){if(H.matrix.fromArray(Z.transform.matrix),H.matrix.decompose(H.position,H.rotation,H.scale),H.matrixWorldNeedsUpdate=!0,Z.linearVelocity)H.hasLinearVelocity=!0,H.linearVelocity.copy(Z.linearVelocity);else H.hasLinearVelocity=!1;if(Z.angularVelocity)H.hasAngularVelocity=!0,H.angularVelocity.copy(Z.angularVelocity);else H.hasAngularVelocity=!1;this.dispatchEvent(MH)}}}if(H!==null)H.visible=Z!==null;if(Y!==null)Y.visible=K!==null;if(X!==null)X.visible=W!==null;return this}_getHandJoint(J,Q){if(J.joints[Q.jointName]===void 0){let $=new _8;$.matrixAutoUpdate=!1,$.visible=!1,J.joints[Q.jointName]=$,J.add($)}return J.joints[Q.jointName]}}var VK={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},f9={h:0,s:0,l:0},z7={h:0,s:0,l:0};function C6(J,Q,$){if($<0)$+=1;if($>1)$-=1;if($<0.16666666666666666)return J+(Q-J)*6*$;if($<0.5)return Q;if($<0.6666666666666666)return J+(Q-J)*6*(0.6666666666666666-$);return J}class g0{constructor(J,Q,$){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(J,Q,$)}set(J,Q,$){if(Q===void 0&&$===void 0){let Z=J;if(Z&&Z.isColor)this.copy(Z);else if(typeof Z==="number")this.setHex(Z);else if(typeof Z==="string")this.setStyle(Z)}else this.setRGB(J,Q,$);return this}setScalar(J){return this.r=J,this.g=J,this.b=J,this}setHex(J,Q="srgb"){return J=Math.floor(J),this.r=(J>>16&255)/255,this.g=(J>>8&255)/255,this.b=(J&255)/255,m0.colorSpaceToWorking(this,Q),this}setRGB(J,Q,$,Z=m0.workingColorSpace){return this.r=J,this.g=Q,this.b=$,m0.colorSpaceToWorking(this,Z),this}setHSL(J,Q,$,Z=m0.workingColorSpace){if(J=lQ(J,1),Q=b0(Q,0,1),$=b0($,0,1),Q===0)this.r=this.g=this.b=$;else{let K=$<=0.5?$*(1+Q):$+Q-$*Q,W=2*$-K;this.r=C6(W,K,J+0.3333333333333333),this.g=C6(W,K,J),this.b=C6(W,K,J-0.3333333333333333)}return m0.colorSpaceToWorking(this,Z),this}setStyle(J,Q="srgb"){function $(K){if(K===void 0)return;if(parseFloat(K)<1)P0("Color: Alpha component of "+J+" will be ignored.")}let Z;if(Z=/^(\w+)\(([^\)]*)\)/.exec(J)){let K,W=Z[1],H=Z[2];switch(W){case"rgb":case"rgba":if(K=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(H))return $(K[4]),this.setRGB(Math.min(255,parseInt(K[1],10))/255,Math.min(255,parseInt(K[2],10))/255,Math.min(255,parseInt(K[3],10))/255,Q);if(K=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(H))return $(K[4]),this.setRGB(Math.min(100,parseInt(K[1],10))/100,Math.min(100,parseInt(K[2],10))/100,Math.min(100,parseInt(K[3],10))/100,Q);break;case"hsl":case"hsla":if(K=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(H))return $(K[4]),this.setHSL(parseFloat(K[1])/360,parseFloat(K[2])/100,parseFloat(K[3])/100,Q);break;default:P0("Color: Unknown color model "+J)}}else if(Z=/^\#([A-Fa-f\d]+)$/.exec(J)){let K=Z[1],W=K.length;if(W===3)return this.setRGB(parseInt(K.charAt(0),16)/15,parseInt(K.charAt(1),16)/15,parseInt(K.charAt(2),16)/15,Q);else if(W===6)return this.setHex(parseInt(K,16),Q);else P0("Color: Invalid hex color "+J)}else if(J&&J.length>0)return this.setColorName(J,Q);return this}setColorName(J,Q="srgb"){let $=VK[J.toLowerCase()];if($!==void 0)this.setHex($,Q);else P0("Color: Unknown color "+J);return this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(J){return this.r=J.r,this.g=J.g,this.b=J.b,this}copySRGBToLinear(J){return this.r=C9(J.r),this.g=C9(J.g),this.b=C9(J.b),this}copyLinearToSRGB(J){return this.r=T8(J.r),this.g=T8(J.g),this.b=T8(J.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(J="srgb"){return m0.workingToColorSpace(PJ.copy(this),J),Math.round(b0(PJ.r*255,0,255))*65536+Math.round(b0(PJ.g*255,0,255))*256+Math.round(b0(PJ.b*255,0,255))}getHexString(J="srgb"){return("000000"+this.getHex(J).toString(16)).slice(-6)}getHSL(J,Q=m0.workingColorSpace){m0.workingToColorSpace(PJ.copy(this),Q);let{r:$,g:Z,b:K}=PJ,W=Math.max($,Z,K),H=Math.min($,Z,K),Y,X,U=(H+W)/2;if(H===W)Y=0,X=0;else{let N=W-H;switch(X=U<=0.5?N/(W+H):N/(2-W-H),W){case $:Y=(Z-K)/N+(Z<K?6:0);break;case Z:Y=(K-$)/N+2;break;case K:Y=($-Z)/N+4;break}Y/=6}return J.h=Y,J.s=X,J.l=U,J}getRGB(J,Q=m0.workingColorSpace){return m0.workingToColorSpace(PJ.copy(this),Q),J.r=PJ.r,J.g=PJ.g,J.b=PJ.b,J}getStyle(J="srgb"){m0.workingToColorSpace(PJ.copy(this),J);let{r:Q,g:$,b:Z}=PJ;if(J!=="srgb")return`color(${J} ${Q.toFixed(3)} ${$.toFixed(3)} ${Z.toFixed(3)})`;return`rgb(${Math.round(Q*255)},${Math.round($*255)},${Math.round(Z*255)})`}offsetHSL(J,Q,$){return this.getHSL(f9),this.setHSL(f9.h+J,f9.s+Q,f9.l+$)}add(J){return this.r+=J.r,this.g+=J.g,this.b+=J.b,this}addColors(J,Q){return this.r=J.r+Q.r,this.g=J.g+Q.g,this.b=J.b+Q.b,this}addScalar(J){return this.r+=J,this.g+=J,this.b+=J,this}sub(J){return this.r=Math.max(0,this.r-J.r),this.g=Math.max(0,this.g-J.g),this.b=Math.max(0,this.b-J.b),this}multiply(J){return this.r*=J.r,this.g*=J.g,this.b*=J.b,this}multiplyScalar(J){return this.r*=J,this.g*=J,this.b*=J,this}lerp(J,Q){return this.r+=(J.r-this.r)*Q,this.g+=(J.g-this.g)*Q,this.b+=(J.b-this.b)*Q,this}lerpColors(J,Q,$){return this.r=J.r+(Q.r-J.r)*$,this.g=J.g+(Q.g-J.g)*$,this.b=J.b+(Q.b-J.b)*$,this}lerpHSL(J,Q){this.getHSL(f9),J.getHSL(z7);let $=J7(f9.h,z7.h,Q),Z=J7(f9.s,z7.s,Q),K=J7(f9.l,z7.l,Q);return this.setHSL($,Z,K),this}setFromVector3(J){return this.r=J.x,this.g=J.y,this.b=J.z,this}applyMatrix3(J){let Q=this.r,$=this.g,Z=this.b,K=J.elements;return this.r=K[0]*Q+K[3]*$+K[6]*Z,this.g=K[1]*Q+K[4]*$+K[7]*Z,this.b=K[2]*Q+K[5]*$+K[8]*Z,this}equals(J){return J.r===this.r&&J.g===this.g&&J.b===this.b}fromArray(J,Q=0){return this.r=J[Q],this.g=J[Q+1],this.b=J[Q+2],this}toArray(J=[],Q=0){return J[Q]=this.r,J[Q+1]=this.g,J[Q+2]=this.b,J}fromBufferAttribute(J,Q){return this.r=J.getX(Q),this.g=J.getY(Q),this.b=J.getZ(Q),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}var PJ=new g0;g0.NAMES=VK;class J6 extends _J{constructor(){super();if(this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new x9,this.environmentIntensity=1,this.environmentRotation=new x9,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(J,Q){if(super.copy(J,Q),J.background!==null)this.background=J.background.clone();if(J.environment!==null)this.environment=J.environment.clone();if(J.fog!==null)this.fog=J.fog.clone();if(this.backgroundBlurriness=J.backgroundBlurriness,this.backgroundIntensity=J.backgroundIntensity,this.backgroundRotation.copy(J.backgroundRotation),this.environmentIntensity=J.environmentIntensity,this.environmentRotation.copy(J.environmentRotation),J.overrideMaterial!==null)this.overrideMaterial=J.overrideMaterial.clone();return this.matrixAutoUpdate=J.matrixAutoUpdate,this}toJSON(J){let Q=super.toJSON(J);if(this.fog!==null)Q.object.fog=this.fog.toJSON();return Q.object.backgroundBlurriness=this.backgroundBlurriness,Q.object.backgroundIntensity=this.backgroundIntensity,Q.object.backgroundRotation=this.backgroundRotation.toArray(),Q.object.environmentIntensity=this.environmentIntensity,Q.object.environmentRotation=this.environmentRotation.toArray(),Q}}var $9=new f,B9=new f,P6=new f,I9=new f,L8=new f,k8=new f,UZ=new f,w6=new f,_6=new f,T6=new f,S6=new UJ,j6=new UJ,y6=new UJ;class aJ{constructor(J=new f,Q=new f,$=new f){this.a=J,this.b=Q,this.c=$}static getNormal(J,Q,$,Z){Z.subVectors($,Q),$9.subVectors(J,Q),Z.cross($9);let K=Z.lengthSq();if(K>0)return Z.multiplyScalar(1/Math.sqrt(K));return Z.set(0,0,0)}static getBarycoord(J,Q,$,Z,K){$9.subVectors(Z,Q),B9.subVectors($,Q),P6.subVectors(J,Q);let W=$9.dot($9),H=$9.dot(B9),Y=$9.dot(P6),X=B9.dot(B9),U=B9.dot(P6),N=W*X-H*H;if(N===0)return K.set(0,0,0),null;let q=1/N,G=(X*Y-H*U)*q,D=(W*U-H*Y)*q;return K.set(1-G-D,D,G)}static containsPoint(J,Q,$,Z){if(this.getBarycoord(J,Q,$,Z,I9)===null)return!1;return I9.x>=0&&I9.y>=0&&I9.x+I9.y<=1}static getInterpolation(J,Q,$,Z,K,W,H,Y){if(this.getBarycoord(J,Q,$,Z,I9)===null){if(Y.x=0,Y.y=0,"z"in Y)Y.z=0;if("w"in Y)Y.w=0;return null}return Y.setScalar(0),Y.addScaledVector(K,I9.x),Y.addScaledVector(W,I9.y),Y.addScaledVector(H,I9.z),Y}static getInterpolatedAttribute(J,Q,$,Z,K,W){return S6.setScalar(0),j6.setScalar(0),y6.setScalar(0),S6.fromBufferAttribute(J,Q),j6.fromBufferAttribute(J,$),y6.fromBufferAttribute(J,Z),W.setScalar(0),W.addScaledVector(S6,K.x),W.addScaledVector(j6,K.y),W.addScaledVector(y6,K.z),W}static isFrontFacing(J,Q,$,Z){return $9.subVectors($,Q),B9.subVectors(J,Q),$9.cross(B9).dot(Z)<0}set(J,Q,$){return this.a.copy(J),this.b.copy(Q),this.c.copy($),this}setFromPointsAndIndices(J,Q,$,Z){return this.a.copy(J[Q]),this.b.copy(J[$]),this.c.copy(J[Z]),this}setFromAttributeAndIndices(J,Q,$,Z){return this.a.fromBufferAttribute(J,Q),this.b.fromBufferAttribute(J,$),this.c.fromBufferAttribute(J,Z),this}clone(){return new this.constructor().copy(this)}copy(J){return this.a.copy(J.a),this.b.copy(J.b),this.c.copy(J.c),this}getArea(){return $9.subVectors(this.c,this.b),B9.subVectors(this.a,this.b),$9.cross(B9).length()*0.5}getMidpoint(J){return J.addVectors(this.a,this.b).add(this.c).multiplyScalar(0.3333333333333333)}getNormal(J){return aJ.getNormal(this.a,this.b,this.c,J)}getPlane(J){return J.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(J,Q){return aJ.getBarycoord(J,this.a,this.b,this.c,Q)}getInterpolation(J,Q,$,Z,K){return aJ.getInterpolation(J,this.a,this.b,this.c,Q,$,Z,K)}containsPoint(J){return aJ.containsPoint(J,this.a,this.b,this.c)}isFrontFacing(J){return aJ.isFrontFacing(this.a,this.b,this.c,J)}intersectsBox(J){return J.intersectsTriangle(this)}closestPointToPoint(J,Q){let $=this.a,Z=this.b,K=this.c,W,H;L8.subVectors(Z,$),k8.subVectors(K,$),w6.subVectors(J,$);let Y=L8.dot(w6),X=k8.dot(w6);if(Y<=0&&X<=0)return Q.copy($);_6.subVectors(J,Z);let U=L8.dot(_6),N=k8.dot(_6);if(U>=0&&N<=U)return Q.copy(Z);let q=Y*N-U*X;if(q<=0&&Y>=0&&U<=0)return W=Y/(Y-U),Q.copy($).addScaledVector(L8,W);T6.subVectors(J,K);let G=L8.dot(T6),D=k8.dot(T6);if(D>=0&&G<=D)return Q.copy(K);let M=G*X-Y*D;if(M<=0&&X>=0&&D<=0)return H=X/(X-D),Q.copy($).addScaledVector(k8,H);let I=U*D-G*N;if(I<=0&&N-U>=0&&G-D>=0)return UZ.subVectors(K,Z),H=(N-U)/(N-U+(G-D)),Q.copy(Z).addScaledVector(UZ,H);let F=1/(I+M+q);return W=M*F,H=q*F,Q.copy($).addScaledVector(L8,W).addScaledVector(k8,H)}equals(J){return J.a.equals(this.a)&&J.b.equals(this.b)&&J.c.equals(this.c)}}class X9{constructor(J=new f(1/0,1/0,1/0),Q=new f(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=J,this.max=Q}set(J,Q){return this.min.copy(J),this.max.copy(Q),this}setFromArray(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q+=3)this.expandByPoint(Z9.fromArray(J,Q));return this}setFromBufferAttribute(J){this.makeEmpty();for(let Q=0,$=J.count;Q<$;Q++)this.expandByPoint(Z9.fromBufferAttribute(J,Q));return this}setFromPoints(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q++)this.expandByPoint(J[Q]);return this}setFromCenterAndSize(J,Q){let $=Z9.copy(Q).multiplyScalar(0.5);return this.min.copy(J).sub($),this.max.copy(J).add($),this}setFromObject(J,Q=!1){return this.makeEmpty(),this.expandByObject(J,Q)}clone(){return new this.constructor().copy(this)}copy(J){return this.min.copy(J.min),this.max.copy(J.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(J){return this.isEmpty()?J.set(0,0,0):J.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(J){return this.isEmpty()?J.set(0,0,0):J.subVectors(this.max,this.min)}expandByPoint(J){return this.min.min(J),this.max.max(J),this}expandByVector(J){return this.min.sub(J),this.max.add(J),this}expandByScalar(J){return this.min.addScalar(-J),this.max.addScalar(J),this}expandByObject(J,Q=!1){J.updateWorldMatrix(!1,!1);let $=J.geometry;if($!==void 0){let K=$.getAttribute("position");if(Q===!0&&K!==void 0&&J.isInstancedMesh!==!0)for(let W=0,H=K.count;W<H;W++){if(J.isMesh===!0)J.getVertexPosition(W,Z9);else Z9.fromBufferAttribute(K,W);Z9.applyMatrix4(J.matrixWorld),this.expandByPoint(Z9)}else{if(J.boundingBox!==void 0){if(J.boundingBox===null)J.computeBoundingBox();A7.copy(J.boundingBox)}else{if($.boundingBox===null)$.computeBoundingBox();A7.copy($.boundingBox)}A7.applyMatrix4(J.matrixWorld),this.union(A7)}}let Z=J.children;for(let K=0,W=Z.length;K<W;K++)this.expandByObject(Z[K],Q);return this}containsPoint(J){return J.x>=this.min.x&&J.x<=this.max.x&&J.y>=this.min.y&&J.y<=this.max.y&&J.z>=this.min.z&&J.z<=this.max.z}containsBox(J){return this.min.x<=J.min.x&&J.max.x<=this.max.x&&this.min.y<=J.min.y&&J.max.y<=this.max.y&&this.min.z<=J.min.z&&J.max.z<=this.max.z}getParameter(J,Q){return Q.set((J.x-this.min.x)/(this.max.x-this.min.x),(J.y-this.min.y)/(this.max.y-this.min.y),(J.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(J){return J.max.x>=this.min.x&&J.min.x<=this.max.x&&J.max.y>=this.min.y&&J.min.y<=this.max.y&&J.max.z>=this.min.z&&J.min.z<=this.max.z}intersectsSphere(J){return this.clampPoint(J.center,Z9),Z9.distanceToSquared(J.center)<=J.radius*J.radius}intersectsPlane(J){let Q,$;if(J.normal.x>0)Q=J.normal.x*this.min.x,$=J.normal.x*this.max.x;else Q=J.normal.x*this.max.x,$=J.normal.x*this.min.x;if(J.normal.y>0)Q+=J.normal.y*this.min.y,$+=J.normal.y*this.max.y;else Q+=J.normal.y*this.max.y,$+=J.normal.y*this.min.y;if(J.normal.z>0)Q+=J.normal.z*this.min.z,$+=J.normal.z*this.max.z;else Q+=J.normal.z*this.max.z,$+=J.normal.z*this.min.z;return Q<=-J.constant&&$>=-J.constant}intersectsTriangle(J){if(this.isEmpty())return!1;this.getCenter(a8),C7.subVectors(this.max,a8),V8.subVectors(J.a,a8),B8.subVectors(J.b,a8),I8.subVectors(J.c,a8),v9.subVectors(B8,V8),h9.subVectors(I8,B8),c9.subVectors(V8,I8);let Q=[0,-v9.z,v9.y,0,-h9.z,h9.y,0,-c9.z,c9.y,v9.z,0,-v9.x,h9.z,0,-h9.x,c9.z,0,-c9.x,-v9.y,v9.x,0,-h9.y,h9.x,0,-c9.y,c9.x,0];if(!f6(Q,V8,B8,I8,C7))return!1;if(Q=[1,0,0,0,1,0,0,0,1],!f6(Q,V8,B8,I8,C7))return!1;return P7.crossVectors(v9,h9),Q=[P7.x,P7.y,P7.z],f6(Q,V8,B8,I8,C7)}clampPoint(J,Q){return Q.copy(J).clamp(this.min,this.max)}distanceToPoint(J){return this.clampPoint(J,Z9).distanceTo(J)}getBoundingSphere(J){if(this.isEmpty())J.makeEmpty();else this.getCenter(J.center),J.radius=this.getSize(Z9).length()*0.5;return J}intersect(J){if(this.min.max(J.min),this.max.min(J.max),this.isEmpty())this.makeEmpty();return this}union(J){return this.min.min(J.min),this.max.max(J.max),this}applyMatrix4(J){if(this.isEmpty())return this;return z9[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(J),z9[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(J),z9[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(J),z9[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(J),z9[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(J),z9[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(J),z9[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(J),z9[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(J),this.setFromPoints(z9),this}translate(J){return this.min.add(J),this.max.add(J),this}equals(J){return J.min.equals(this.min)&&J.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(J){return this.min.fromArray(J.min),this.max.fromArray(J.max),this}}var z9=[new f,new f,new f,new f,new f,new f,new f,new f],Z9=new f,A7=new X9,V8=new f,B8=new f,I8=new f,v9=new f,h9=new f,c9=new f,a8=new f,C7=new f,P7=new f,n9=new f;function f6(J,Q,$,Z,K){for(let W=0,H=J.length-3;W<=H;W+=3){n9.fromArray(J,W);let Y=K.x*Math.abs(n9.x)+K.y*Math.abs(n9.y)+K.z*Math.abs(n9.z),X=Q.dot(n9),U=$.dot(n9),N=Z.dot(n9);if(Math.max(-Math.max(X,U,N),Math.min(X,U,N))>Y)return!1}return!0}var qJ=new f,w7=new w0,LH=0;class K9 extends O9{constructor(J,Q,$=!1){super();if(Array.isArray(J))throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:LH++}),this.name="",this.array=J,this.itemSize=Q,this.count=J!==void 0?J.length/Q:0,this.normalized=$,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.name=J.name,this.array=new J.array.constructor(J.array),this.itemSize=J.itemSize,this.count=J.count,this.normalized=J.normalized,this.usage=J.usage,this.gpuType=J.gpuType,this}copyAt(J,Q,$){J*=this.itemSize,$*=Q.itemSize;for(let Z=0,K=this.itemSize;Z<K;Z++)this.array[J+Z]=Q.array[$+Z];return this}copyArray(J){return this.array.set(J),this}applyMatrix3(J){if(this.itemSize===2)for(let Q=0,$=this.count;Q<$;Q++)w7.fromBufferAttribute(this,Q),w7.applyMatrix3(J),this.setXY(Q,w7.x,w7.y);else if(this.itemSize===3)for(let Q=0,$=this.count;Q<$;Q++)qJ.fromBufferAttribute(this,Q),qJ.applyMatrix3(J),this.setXYZ(Q,qJ.x,qJ.y,qJ.z);return this}applyMatrix4(J){for(let Q=0,$=this.count;Q<$;Q++)qJ.fromBufferAttribute(this,Q),qJ.applyMatrix4(J),this.setXYZ(Q,qJ.x,qJ.y,qJ.z);return this}applyNormalMatrix(J){for(let Q=0,$=this.count;Q<$;Q++)qJ.fromBufferAttribute(this,Q),qJ.applyNormalMatrix(J),this.setXYZ(Q,qJ.x,qJ.y,qJ.z);return this}transformDirection(J){for(let Q=0,$=this.count;Q<$;Q++)qJ.fromBufferAttribute(this,Q),qJ.transformDirection(J),this.setXYZ(Q,qJ.x,qJ.y,qJ.z);return this}set(J,Q=0){return this.array.set(J,Q),this}getComponent(J,Q){let $=this.array[J*this.itemSize+Q];if(this.normalized)$=w8($,this.array);return $}setComponent(J,Q,$){if(this.normalized)$=yJ($,this.array);return this.array[J*this.itemSize+Q]=$,this}getX(J){let Q=this.array[J*this.itemSize];if(this.normalized)Q=w8(Q,this.array);return Q}setX(J,Q){if(this.normalized)Q=yJ(Q,this.array);return this.array[J*this.itemSize]=Q,this}getY(J){let Q=this.array[J*this.itemSize+1];if(this.normalized)Q=w8(Q,this.array);return Q}setY(J,Q){if(this.normalized)Q=yJ(Q,this.array);return this.array[J*this.itemSize+1]=Q,this}getZ(J){let Q=this.array[J*this.itemSize+2];if(this.normalized)Q=w8(Q,this.array);return Q}setZ(J,Q){if(this.normalized)Q=yJ(Q,this.array);return this.array[J*this.itemSize+2]=Q,this}getW(J){let Q=this.array[J*this.itemSize+3];if(this.normalized)Q=w8(Q,this.array);return Q}setW(J,Q){if(this.normalized)Q=yJ(Q,this.array);return this.array[J*this.itemSize+3]=Q,this}setXY(J,Q,$){if(J*=this.itemSize,this.normalized)Q=yJ(Q,this.array),$=yJ($,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this}setXYZ(J,Q,$,Z){if(J*=this.itemSize,this.normalized)Q=yJ(Q,this.array),$=yJ($,this.array),Z=yJ(Z,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this.array[J+2]=Z,this}setXYZW(J,Q,$,Z,K){if(J*=this.itemSize,this.normalized)Q=yJ(Q,this.array),$=yJ($,this.array),Z=yJ(Z,this.array),K=yJ(K,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this.array[J+2]=Z,this.array[J+3]=K,this}onUpload(J){return this.onUploadCallback=J,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let J={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return J.name=this.name,J.usage=this.usage,J.gpuType=this.gpuType,J}dispose(){this.dispatchEvent({type:"dispose"})}}class Q6 extends K9{constructor(J,Q,$){super(new Uint16Array(J),Q,$)}}class $6 extends K9{constructor(J,Q,$){super(new Uint32Array(J),Q,$)}}class IJ extends K9{constructor(J,Q,$){super(new Float32Array(J),Q,$)}}var kH=new X9,r8=new f,v6=new f;class G7{constructor(J=new f,Q=-1){this.isSphere=!0,this.center=J,this.radius=Q}set(J,Q){return this.center.copy(J),this.radius=Q,this}setFromPoints(J,Q){let $=this.center;if(Q!==void 0)$.copy(Q);else kH.setFromPoints(J).getCenter($);let Z=0;for(let K=0,W=J.length;K<W;K++)Z=Math.max(Z,$.distanceToSquared(J[K]));return this.radius=Math.sqrt(Z),this}copy(J){return this.center.copy(J.center),this.radius=J.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(J){return J.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(J){return J.distanceTo(this.center)-this.radius}intersectsSphere(J){let Q=this.radius+J.radius;return J.center.distanceToSquared(this.center)<=Q*Q}intersectsBox(J){return J.intersectsSphere(this)}intersectsPlane(J){return Math.abs(J.distanceToPoint(this.center))<=this.radius}clampPoint(J,Q){let $=this.center.distanceToSquared(J);if(Q.copy(J),$>this.radius*this.radius)Q.sub(this.center).normalize(),Q.multiplyScalar(this.radius).add(this.center);return Q}getBoundingBox(J){if(this.isEmpty())return J.makeEmpty(),J;return J.set(this.center,this.center),J.expandByScalar(this.radius),J}applyMatrix4(J){return this.center.applyMatrix4(J),this.radius=this.radius*J.getMaxScaleOnAxis(),this}translate(J){return this.center.add(J),this}expandByPoint(J){if(this.isEmpty())return this.center.copy(J),this.radius=0,this;r8.subVectors(J,this.center);let Q=r8.lengthSq();if(Q>this.radius*this.radius){let $=Math.sqrt(Q),Z=($-this.radius)*0.5;this.center.addScaledVector(r8,Z/$),this.radius+=Z}return this}union(J){if(J.isEmpty())return this;if(this.isEmpty())return this.copy(J),this;if(this.center.equals(J.center)===!0)this.radius=Math.max(this.radius,J.radius);else v6.subVectors(J.center,this.center).setLength(J.radius),this.expandByPoint(r8.copy(J.center).add(v6)),this.expandByPoint(r8.copy(J.center).sub(v6));return this}equals(J){return J.center.equals(this.center)&&J.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(J){return this.radius=J.radius,this.center.fromArray(J.center),this}}var VH=0,iJ=new KJ,h6=new _J,z8=new f,dJ=new X9,t8=new X9,VJ=new f;class gJ extends O9{constructor(){super();this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:VH++}),this.uuid=x8(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(J){if(Array.isArray(J))this.index=new((cW(J))?$6:Q6)(J,1);else this.index=J;return this}setIndirect(J,Q=0){return this.indirect=J,this.indirectOffset=Q,this}getIndirect(){return this.indirect}getAttribute(J){return this.attributes[J]}setAttribute(J,Q){return this.attributes[J]=Q,this}deleteAttribute(J){return delete this.attributes[J],this}hasAttribute(J){return this.attributes[J]!==void 0}addGroup(J,Q,$=0){this.groups.push({start:J,count:Q,materialIndex:$})}clearGroups(){this.groups=[]}setDrawRange(J,Q){this.drawRange.start=J,this.drawRange.count=Q}applyMatrix4(J){let Q=this.attributes.position;if(Q!==void 0)Q.applyMatrix4(J),Q.needsUpdate=!0;let $=this.attributes.normal;if($!==void 0){let K=new j0().getNormalMatrix(J);$.applyNormalMatrix(K),$.needsUpdate=!0}let Z=this.attributes.tangent;if(Z!==void 0)Z.transformDirection(J),Z.needsUpdate=!0;if(this.boundingBox!==null)this.computeBoundingBox();if(this.boundingSphere!==null)this.computeBoundingSphere();return this._transformed=!0,this}applyQuaternion(J){return iJ.makeRotationFromQuaternion(J),this.applyMatrix4(iJ),this}rotateX(J){return iJ.makeRotationX(J),this.applyMatrix4(iJ),this}rotateY(J){return iJ.makeRotationY(J),this.applyMatrix4(iJ),this}rotateZ(J){return iJ.makeRotationZ(J),this.applyMatrix4(iJ),this}translate(J,Q,$){return iJ.makeTranslation(J,Q,$),this.applyMatrix4(iJ),this}scale(J,Q,$){return iJ.makeScale(J,Q,$),this.applyMatrix4(iJ),this}lookAt(J){return h6.lookAt(J),h6.updateMatrix(),this.applyMatrix4(h6.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(z8).negate(),this.translate(z8.x,z8.y,z8.z),this}setFromPoints(J){let Q=this.getAttribute("position");if(Q===void 0){let $=[];for(let Z=0,K=J.length;Z<K;Z++){let W=J[Z];$.push(W.x,W.y,W.z||0)}this.setAttribute("position",new IJ($,3))}else{let $=Math.min(J.length,Q.count);for(let Z=0;Z<$;Z++){let K=J[Z];Q.setXYZ(Z,K.x,K.y,K.z||0)}if(J.length>Q.count)P0("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.");Q.needsUpdate=!0}return this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new X9;let J=this.attributes.position,Q=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){S0("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new f(-1/0,-1/0,-1/0),new f(1/0,1/0,1/0));return}if(J!==void 0){if(this.boundingBox.setFromBufferAttribute(J),Q)for(let $=0,Z=Q.length;$<Z;$++){let K=Q[$];if(dJ.setFromBufferAttribute(K),this.morphTargetsRelative)VJ.addVectors(this.boundingBox.min,dJ.min),this.boundingBox.expandByPoint(VJ),VJ.addVectors(this.boundingBox.max,dJ.max),this.boundingBox.expandByPoint(VJ);else this.boundingBox.expandByPoint(dJ.min),this.boundingBox.expandByPoint(dJ.max)}}else this.boundingBox.makeEmpty();if(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))S0('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new G7;let J=this.attributes.position,Q=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){S0("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new f,1/0);return}if(J){let $=this.boundingSphere.center;if(dJ.setFromBufferAttribute(J),Q)for(let K=0,W=Q.length;K<W;K++){let H=Q[K];if(t8.setFromBufferAttribute(H),this.morphTargetsRelative)VJ.addVectors(dJ.min,t8.min),dJ.expandByPoint(VJ),VJ.addVectors(dJ.max,t8.max),dJ.expandByPoint(VJ);else dJ.expandByPoint(t8.min),dJ.expandByPoint(t8.max)}dJ.getCenter($);let Z=0;for(let K=0,W=J.count;K<W;K++)VJ.fromBufferAttribute(J,K),Z=Math.max(Z,$.distanceToSquared(VJ));if(Q)for(let K=0,W=Q.length;K<W;K++){let H=Q[K],Y=this.morphTargetsRelative;for(let X=0,U=H.count;X<U;X++){if(VJ.fromBufferAttribute(H,X),Y)z8.fromBufferAttribute(J,X),VJ.add(z8);Z=Math.max(Z,$.distanceToSquared(VJ))}}if(this.boundingSphere.radius=Math.sqrt(Z),isNaN(this.boundingSphere.radius))S0('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let J=this.index,Q=this.attributes;if(J===null||Q.position===void 0||Q.normal===void 0||Q.uv===void 0){S0("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let{position:$,normal:Z,uv:K}=Q,W=this.getAttribute("tangent");if(W===void 0||W.count!==$.count)W=new K9(new Float32Array(4*$.count),4),this.setAttribute("tangent",W);let H=[],Y=[];for(let P=0;P<$.count;P++)H[P]=new f,Y[P]=new f;let X=new f,U=new f,N=new f,q=new w0,G=new w0,D=new w0,M=new f,I=new f;function F(P,L,B){X.fromBufferAttribute($,P),U.fromBufferAttribute($,L),N.fromBufferAttribute($,B),q.fromBufferAttribute(K,P),G.fromBufferAttribute(K,L),D.fromBufferAttribute(K,B),U.sub(X),N.sub(X),G.sub(q),D.sub(q);let l=1/(G.x*D.y-D.x*G.y);if(!isFinite(l))return;M.copy(U).multiplyScalar(D.y).addScaledVector(N,-G.y).multiplyScalar(l),I.copy(N).multiplyScalar(G.x).addScaledVector(U,-D.x).multiplyScalar(l),H[P].add(M),H[L].add(M),H[B].add(M),Y[P].add(I),Y[L].add(I),Y[B].add(I)}let E=this.groups;if(E.length===0)E=[{start:0,count:J.count}];for(let P=0,L=E.length;P<L;++P){let B=E[P],l=B.start,v=B.count;for(let h=l,r=l+v;h<r;h+=3)F(J.getX(h+0),J.getX(h+1),J.getX(h+2))}let A=new f,_=new f,V=new f,z=new f;function C(P){V.fromBufferAttribute(Z,P),z.copy(V);let L=H[P];A.copy(L),A.sub(V.multiplyScalar(V.dot(L))).normalize(),_.crossVectors(z,L);let l=_.dot(Y[P])<0?-1:1;W.setXYZW(P,A.x,A.y,A.z,l)}for(let P=0,L=E.length;P<L;++P){let B=E[P],l=B.start,v=B.count;for(let h=l,r=l+v;h<r;h+=3)C(J.getX(h+0)),C(J.getX(h+1)),C(J.getX(h+2))}this._transformed=!0}computeVertexNormals(){let J=this.index,Q=this.getAttribute("position");if(Q!==void 0){let $=this.getAttribute("normal");if($===void 0||$.count!==Q.count)$=new K9(new Float32Array(Q.count*3),3),this.setAttribute("normal",$);else for(let q=0,G=$.count;q<G;q++)$.setXYZ(q,0,0,0);let Z=new f,K=new f,W=new f,H=new f,Y=new f,X=new f,U=new f,N=new f;if(J)for(let q=0,G=J.count;q<G;q+=3){let D=J.getX(q+0),M=J.getX(q+1),I=J.getX(q+2);Z.fromBufferAttribute(Q,D),K.fromBufferAttribute(Q,M),W.fromBufferAttribute(Q,I),U.subVectors(W,K),N.subVectors(Z,K),U.cross(N),H.fromBufferAttribute($,D),Y.fromBufferAttribute($,M),X.fromBufferAttribute($,I),H.add(U),Y.add(U),X.add(U),$.setXYZ(D,H.x,H.y,H.z),$.setXYZ(M,Y.x,Y.y,Y.z),$.setXYZ(I,X.x,X.y,X.z)}else for(let q=0,G=Q.count;q<G;q+=3)Z.fromBufferAttribute(Q,q+0),K.fromBufferAttribute(Q,q+1),W.fromBufferAttribute(Q,q+2),U.subVectors(W,K),N.subVectors(Z,K),U.cross(N),$.setXYZ(q+0,U.x,U.y,U.z),$.setXYZ(q+1,U.x,U.y,U.z),$.setXYZ(q+2,U.x,U.y,U.z);this.normalizeNormals(),$.needsUpdate=!0}}normalizeNormals(){let J=this.attributes.normal;for(let Q=0,$=J.count;Q<$;Q++)VJ.fromBufferAttribute(J,Q),VJ.normalize(),J.setXYZ(Q,VJ.x,VJ.y,VJ.z)}toNonIndexed(){function J(H,Y){let{array:X,itemSize:U,normalized:N}=H,q=new X.constructor(Y.length*U),G=0,D=0;for(let M=0,I=Y.length;M<I;M++){if(H.isInterleavedBufferAttribute)G=Y[M]*H.data.stride+H.offset;else G=Y[M]*U;for(let F=0;F<U;F++)q[D++]=X[G++]}return new K9(q,U,N)}if(this.index===null)return P0("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let Q=new gJ,$=this.index.array,Z=this.attributes;for(let H in Z){let Y=Z[H],X=J(Y,$);Q.setAttribute(H,X)}let K=this.morphAttributes;for(let H in K){let Y=[],X=K[H];for(let U=0,N=X.length;U<N;U++){let q=X[U],G=J(q,$);Y.push(G)}Q.morphAttributes[H]=Y}Q.morphTargetsRelative=this.morphTargetsRelative;let W=this.groups;for(let H=0,Y=W.length;H<Y;H++){let X=W[H];Q.addGroup(X.start,X.count,X.materialIndex)}return Q}toJSON(){let J={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(J.uuid=this.uuid,J.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,J.name=this.name,Object.keys(this.userData).length>0)J.userData=this.userData;if(this.parameters!==void 0&&this._transformed!==!0){let Y=this.parameters;for(let X in Y)if(Y[X]!==void 0)J[X]=Y[X];return J}J.data={attributes:{}};let Q=this.index;if(Q!==null)J.data.index={type:Q.array.constructor.name,array:Array.prototype.slice.call(Q.array)};let $=this.attributes;for(let Y in $){let X=$[Y];J.data.attributes[Y]=X.toJSON(J.data)}let Z={},K=!1;for(let Y in this.morphAttributes){let X=this.morphAttributes[Y],U=[];for(let N=0,q=X.length;N<q;N++){let G=X[N];U.push(G.toJSON(J.data))}if(U.length>0)Z[Y]=U,K=!0}if(K)J.data.morphAttributes=Z,J.data.morphTargetsRelative=this.morphTargetsRelative;let W=this.groups;if(W.length>0)J.data.groups=JSON.parse(JSON.stringify(W));let H=this.boundingSphere;if(H!==null)J.data.boundingSphere=H.toJSON();return J}clone(){return new this.constructor().copy(this)}copy(J){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let Q={};this.name=J.name;let $=J.index;if($!==null)this.setIndex($.clone());let Z=J.attributes;for(let X in Z){let U=Z[X];this.setAttribute(X,U.clone(Q))}let K=J.morphAttributes;for(let X in K){let U=[],N=K[X];for(let q=0,G=N.length;q<G;q++)U.push(N[q].clone(Q));this.morphAttributes[X]=U}this.morphTargetsRelative=J.morphTargetsRelative;let W=J.groups;for(let X=0,U=W.length;X<U;X++){let N=W[X];this.addGroup(N.start,N.count,N.materialIndex)}let H=J.boundingBox;if(H!==null)this.boundingBox=H.clone();let Y=J.boundingSphere;if(Y!==null)this.boundingSphere=Y.clone();return this.drawRange.start=J.drawRange.start,this.drawRange.count=J.drawRange.count,this.userData=J.userData,this._transformed=J._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}var b6=new f,BH=new f,IH=new j0;class oJ{constructor(J=new f(1,0,0),Q=0){this.isPlane=!0,this.normal=J,this.constant=Q}set(J,Q){return this.normal.copy(J),this.constant=Q,this}setComponents(J,Q,$,Z){return this.normal.set(J,Q,$),this.constant=Z,this}setFromNormalAndCoplanarPoint(J,Q){return this.normal.copy(J),this.constant=-Q.dot(this.normal),this}setFromCoplanarPoints(J,Q,$){let Z=b6.subVectors($,Q).cross(BH.subVectors(J,Q)).normalize();return this.setFromNormalAndCoplanarPoint(Z,J),this}copy(J){return this.normal.copy(J.normal),this.constant=J.constant,this}normalize(){let J=1/this.normal.length();return this.normal.multiplyScalar(J),this.constant*=J,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(J){return this.normal.dot(J)+this.constant}distanceToSphere(J){return this.distanceToPoint(J.center)-J.radius}projectPoint(J,Q){return Q.copy(J).addScaledVector(this.normal,-this.distanceToPoint(J))}intersectLine(J,Q,$=!0){let Z=J.delta(b6),K=this.normal.dot(Z);if(K===0){if(this.distanceToPoint(J.start)===0)return Q.copy(J.start);return null}let W=-(J.start.dot(this.normal)+this.constant)/K;if($===!0&&(W<0||W>1))return null;return Q.copy(J.start).addScaledVector(Z,W)}intersectsLine(J){let Q=this.distanceToPoint(J.start),$=this.distanceToPoint(J.end);return Q<0&&$>0||$<0&&Q>0}intersectsBox(J){return J.intersectsPlane(this)}intersectsSphere(J){return J.intersectsPlane(this)}coplanarPoint(J){return J.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(J,Q){let $=Q||IH.getNormalMatrix(J),Z=this.coplanarPoint(b6).applyMatrix4(J),K=this.normal.applyMatrix3($).normalize();return this.constant=-Z.dot(K),this}translate(J){return this.constant-=J.dot(this.normal),this}equals(J){return J.normal.equals(this.normal)&&J.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(J){return this.normal.fromArray(J.normal),this.constant=J.constant,this}}var zH=0;class g8 extends O9{constructor(){super();this.isMaterial=!0,Object.defineProperty(this,"id",{value:zH++}),this.uuid=x8(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new g0(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(J){if(this._alphaTest>0!==J>0)this.version++;this._alphaTest=J}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(J){if(J===void 0)return;for(let Q in J){let $=J[Q];if($===void 0){P0(`Material: parameter '${Q}' has value of undefined.`);continue}let Z=this[Q];if(Z===void 0){P0(`Material: '${Q}' is not a property of THREE.${this.type}.`);continue}if(Z&&Z.isColor)Z.set($);else if(Z&&Z.isVector2&&($&&$.isVector2)||Z&&Z.isEuler&&($&&$.isEuler)||Z&&Z.isVector3&&($&&$.isVector3))Z.copy($);else this[Q]=$}}toJSON(J){let Q=J===void 0||typeof J==="string";if(Q)J={textures:{},images:{}};let $={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};if($.uuid=this.uuid,$.type=this.type,$.blending=this.blending,$.side=this.side,$.shadowSide=this.shadowSide,$.vertexColors=this.vertexColors,$.opacity=this.opacity,$.transparent=this.transparent,$.blendSrc=this.blendSrc,$.blendDst=this.blendDst,$.blendEquation=this.blendEquation,$.blendSrcAlpha=this.blendSrcAlpha,$.blendDstAlpha=this.blendDstAlpha,$.blendEquationAlpha=this.blendEquationAlpha,$.blendColor=this.blendColor.getHex(),$.blendAlpha=this.blendAlpha,$.depthFunc=this.depthFunc,$.depthTest=this.depthTest,$.depthWrite=this.depthWrite,$.colorWrite=this.colorWrite,$.clipIntersection=this.clipIntersection,$.clipShadows=this.clipShadows,$.stencilWriteMask=this.stencilWriteMask,$.stencilFunc=this.stencilFunc,$.stencilRef=this.stencilRef,$.stencilFuncMask=this.stencilFuncMask,$.stencilFail=this.stencilFail,$.stencilZFail=this.stencilZFail,$.stencilZPass=this.stencilZPass,$.stencilWrite=this.stencilWrite,$.polygonOffset=this.polygonOffset,$.polygonOffsetFactor=this.polygonOffsetFactor,$.polygonOffsetUnits=this.polygonOffsetUnits,$.dithering=this.dithering,$.alphaTest=this.alphaTest,$.alphaHash=this.alphaHash,$.alphaToCoverage=this.alphaToCoverage,$.premultipliedAlpha=this.premultipliedAlpha,$.forceSinglePass=this.forceSinglePass,$.allowOverride=this.allowOverride,$.visible=this.visible,$.toneMapped=this.toneMapped,$.name=this.name,this.color&&this.color.isColor)$.color=this.color.getHex();if(this.roughness!==void 0)$.roughness=this.roughness;if(this.metalness!==void 0)$.metalness=this.metalness;if(this.sheen!==void 0)$.sheen=this.sheen;if(this.sheenColor&&this.sheenColor.isColor)$.sheenColor=this.sheenColor.getHex();if(this.sheenRoughness!==void 0)$.sheenRoughness=this.sheenRoughness;if(this.emissive&&this.emissive.isColor)$.emissive=this.emissive.getHex();if(this.emissiveIntensity!==void 0)$.emissiveIntensity=this.emissiveIntensity;if(this.specular&&this.specular.isColor)$.specular=this.specular.getHex();if(this.specularIntensity!==void 0)$.specularIntensity=this.specularIntensity;if(this.specularColor&&this.specularColor.isColor)$.specularColor=this.specularColor.getHex();if(this.shininess!==void 0)$.shininess=this.shininess;if(this.clearcoat!==void 0)$.clearcoat=this.clearcoat;if(this.clearcoatRoughness!==void 0)$.clearcoatRoughness=this.clearcoatRoughness;if(this.clearcoatMap&&this.clearcoatMap.isTexture)$.clearcoatMap=this.clearcoatMap.toJSON(J).uuid;if(this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture)$.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(J).uuid;if(this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture)$.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(J).uuid,$.clearcoatNormalScale=this.clearcoatNormalScale.toArray();if(this.sheenColorMap&&this.sheenColorMap.isTexture)$.sheenColorMap=this.sheenColorMap.toJSON(J).uuid;if(this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture)$.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(J).uuid;if(this.dispersion!==void 0)$.dispersion=this.dispersion;if(this.retroreflectivity!==void 0)$.retroreflectivity=this.retroreflectivity;if(this.iridescence!==void 0)$.iridescence=this.iridescence;if(this.iridescenceIOR!==void 0)$.iridescenceIOR=this.iridescenceIOR;if(this.iridescenceThicknessRange!==void 0)$.iridescenceThicknessRange=this.iridescenceThicknessRange;if(this.iridescenceMap&&this.iridescenceMap.isTexture)$.iridescenceMap=this.iridescenceMap.toJSON(J).uuid;if(this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture)$.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(J).uuid;if(this.anisotropy!==void 0)$.anisotropy=this.anisotropy;if(this.anisotropyRotation!==void 0)$.anisotropyRotation=this.anisotropyRotation;if(this.anisotropyMap&&this.anisotropyMap.isTexture)$.anisotropyMap=this.anisotropyMap.toJSON(J).uuid;if(this.map&&this.map.isTexture)$.map=this.map.toJSON(J).uuid;if(this.matcap&&this.matcap.isTexture)$.matcap=this.matcap.toJSON(J).uuid;if(this.alphaMap&&this.alphaMap.isTexture)$.alphaMap=this.alphaMap.toJSON(J).uuid;if(this.lightMap&&this.lightMap.isTexture)$.lightMap=this.lightMap.toJSON(J).uuid,$.lightMapIntensity=this.lightMapIntensity;if(this.aoMap&&this.aoMap.isTexture)$.aoMap=this.aoMap.toJSON(J).uuid,$.aoMapIntensity=this.aoMapIntensity;if(this.bumpMap&&this.bumpMap.isTexture)$.bumpMap=this.bumpMap.toJSON(J).uuid,$.bumpScale=this.bumpScale;if(this.normalMap&&this.normalMap.isTexture)$.normalMap=this.normalMap.toJSON(J).uuid,$.normalMapType=this.normalMapType,$.normalScale=this.normalScale.toArray();if(this.displacementMap&&this.displacementMap.isTexture)$.displacementMap=this.displacementMap.toJSON(J).uuid,$.displacementScale=this.displacementScale,$.displacementBias=this.displacementBias;if(this.roughnessMap&&this.roughnessMap.isTexture)$.roughnessMap=this.roughnessMap.toJSON(J).uuid;if(this.metalnessMap&&this.metalnessMap.isTexture)$.metalnessMap=this.metalnessMap.toJSON(J).uuid;if(this.emissiveMap&&this.emissiveMap.isTexture)$.emissiveMap=this.emissiveMap.toJSON(J).uuid;if(this.specularMap&&this.specularMap.isTexture)$.specularMap=this.specularMap.toJSON(J).uuid;if(this.specularIntensityMap&&this.specularIntensityMap.isTexture)$.specularIntensityMap=this.specularIntensityMap.toJSON(J).uuid;if(this.specularColorMap&&this.specularColorMap.isTexture)$.specularColorMap=this.specularColorMap.toJSON(J).uuid;if(this.envMap&&this.envMap.isTexture){if($.envMap=this.envMap.toJSON(J).uuid,this.combine!==void 0)$.combine=this.combine}if(this.envMapRotation!==void 0)$.envMapRotation=this.envMapRotation.toArray();if(this.envMapIntensity!==void 0)$.envMapIntensity=this.envMapIntensity;if(this.reflectivity!==void 0)$.reflectivity=this.reflectivity;if(this.refractionRatio!==void 0)$.refractionRatio=this.refractionRatio;if(this.gradientMap&&this.gradientMap.isTexture)$.gradientMap=this.gradientMap.toJSON(J).uuid;if(this.transmission!==void 0)$.transmission=this.transmission;if(this.transmissionMap&&this.transmissionMap.isTexture)$.transmissionMap=this.transmissionMap.toJSON(J).uuid;if(this.thickness!==void 0)$.thickness=this.thickness;if(this.thicknessMap&&this.thicknessMap.isTexture)$.thicknessMap=this.thicknessMap.toJSON(J).uuid;if(this.attenuationDistance!==void 0)$.attenuationDistance=this.attenuationDistance;if(this.attenuationColor!==void 0)$.attenuationColor=this.attenuationColor.getHex();if(this.size!==void 0)$.size=this.size;if(this.sizeAttenuation!==void 0)$.sizeAttenuation=this.sizeAttenuation;if(Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0)$.clippingPlanes=this.clippingPlanes.map((K)=>K.toJSON());if(this.rotation!==void 0)$.rotation=this.rotation;if(this.depthPacking!==void 0)$.depthPacking=this.depthPacking;if(this.linewidth!==void 0)$.linewidth=this.linewidth;if(this.linecap!==void 0)$.linecap=this.linecap;if(this.linejoin!==void 0)$.linejoin=this.linejoin;if(this.dashSize!==void 0)$.dashSize=this.dashSize;if(this.gapSize!==void 0)$.gapSize=this.gapSize;if(this.scale!==void 0)$.scale=this.scale;if(this.wireframe!==void 0)$.wireframe=this.wireframe;if(this.wireframeLinewidth!==void 0)$.wireframeLinewidth=this.wireframeLinewidth;if(this.wireframeLinecap!==void 0)$.wireframeLinecap=this.wireframeLinecap;if(this.wireframeLinejoin!==void 0)$.wireframeLinejoin=this.wireframeLinejoin;if(this.flatShading!==void 0)$.flatShading=this.flatShading;if(this.fog!==void 0)$.fog=this.fog;if(Object.keys(this.userData).length>0)$.userData=this.userData;function Z(K){let W=[];for(let H in K){let Y=K[H];delete Y.metadata,W.push(Y)}return W}if(Q){let K=Z(J.textures),W=Z(J.images);if(K.length>0)$.textures=K;if(W.length>0)$.images=W}return $}fromJSON(J,Q){if(J.uuid!==void 0)this.uuid=J.uuid;if(J.name!==void 0)this.name=J.name;if(J.color!==void 0&&this.color!==void 0)this.color.setHex(J.color);if(J.roughness!==void 0)this.roughness=J.roughness;if(J.metalness!==void 0)this.metalness=J.metalness;if(J.sheen!==void 0)this.sheen=J.sheen;if(J.sheenColor!==void 0)this.sheenColor=new g0().setHex(J.sheenColor);if(J.sheenRoughness!==void 0)this.sheenRoughness=J.sheenRoughness;if(J.emissive!==void 0&&this.emissive!==void 0)this.emissive.setHex(J.emissive);if(J.specular!==void 0&&this.specular!==void 0)this.specular.setHex(J.specular);if(J.specularIntensity!==void 0)this.specularIntensity=J.specularIntensity;if(J.specularColor!==void 0&&this.specularColor!==void 0)this.specularColor.setHex(J.specularColor);if(J.shininess!==void 0)this.shininess=J.shininess;if(J.clearcoat!==void 0)this.clearcoat=J.clearcoat;if(J.clearcoatRoughness!==void 0)this.clearcoatRoughness=J.clearcoatRoughness;if(J.dispersion!==void 0)this.dispersion=J.dispersion;if(J.retroreflectivity!==void 0)this.retroreflectivity=J.retroreflectivity;if(J.iridescence!==void 0)this.iridescence=J.iridescence;if(J.iridescenceIOR!==void 0)this.iridescenceIOR=J.iridescenceIOR;if(J.iridescenceThicknessRange!==void 0)this.iridescenceThicknessRange=J.iridescenceThicknessRange;if(J.transmission!==void 0)this.transmission=J.transmission;if(J.thickness!==void 0)this.thickness=J.thickness;if(J.attenuationDistance!==void 0)this.attenuationDistance=J.attenuationDistance;if(J.attenuationColor!==void 0&&this.attenuationColor!==void 0)this.attenuationColor.setHex(J.attenuationColor);if(J.anisotropy!==void 0)this.anisotropy=J.anisotropy;if(J.anisotropyRotation!==void 0)this.anisotropyRotation=J.anisotropyRotation;if(J.fog!==void 0)this.fog=J.fog;if(J.flatShading!==void 0)this.flatShading=J.flatShading;if(J.blending!==void 0)this.blending=J.blending;if(J.combine!==void 0)this.combine=J.combine;if(J.side!==void 0)this.side=J.side;if(J.shadowSide!==void 0)this.shadowSide=J.shadowSide;if(J.opacity!==void 0)this.opacity=J.opacity;if(J.transparent!==void 0)this.transparent=J.transparent;if(J.alphaTest!==void 0)this.alphaTest=J.alphaTest;if(J.alphaHash!==void 0)this.alphaHash=J.alphaHash;if(J.depthFunc!==void 0)this.depthFunc=J.depthFunc;if(J.depthTest!==void 0)this.depthTest=J.depthTest;if(J.depthWrite!==void 0)this.depthWrite=J.depthWrite;if(J.colorWrite!==void 0)this.colorWrite=J.colorWrite;if(J.clippingPlanes!==void 0)this.clippingPlanes=J.clippingPlanes.map(($)=>new oJ().fromJSON($));if(J.clipIntersection!==void 0)this.clipIntersection=J.clipIntersection;if(J.clipShadows!==void 0)this.clipShadows=J.clipShadows;if(J.depthPacking!==void 0)this.depthPacking=J.depthPacking;if(J.blendSrc!==void 0)this.blendSrc=J.blendSrc;if(J.blendDst!==void 0)this.blendDst=J.blendDst;if(J.blendEquation!==void 0)this.blendEquation=J.blendEquation;if(J.blendSrcAlpha!==void 0)this.blendSrcAlpha=J.blendSrcAlpha;if(J.blendDstAlpha!==void 0)this.blendDstAlpha=J.blendDstAlpha;if(J.blendEquationAlpha!==void 0)this.blendEquationAlpha=J.blendEquationAlpha;if(J.blendColor!==void 0&&this.blendColor!==void 0)this.blendColor.setHex(J.blendColor);if(J.blendAlpha!==void 0)this.blendAlpha=J.blendAlpha;if(J.stencilWriteMask!==void 0)this.stencilWriteMask=J.stencilWriteMask;if(J.stencilFunc!==void 0)this.stencilFunc=J.stencilFunc;if(J.stencilRef!==void 0)this.stencilRef=J.stencilRef;if(J.stencilFuncMask!==void 0)this.stencilFuncMask=J.stencilFuncMask;if(J.stencilFail!==void 0)this.stencilFail=J.stencilFail;if(J.stencilZFail!==void 0)this.stencilZFail=J.stencilZFail;if(J.stencilZPass!==void 0)this.stencilZPass=J.stencilZPass;if(J.stencilWrite!==void 0)this.stencilWrite=J.stencilWrite;if(J.wireframe!==void 0)this.wireframe=J.wireframe;if(J.wireframeLinewidth!==void 0)this.wireframeLinewidth=J.wireframeLinewidth;if(J.wireframeLinecap!==void 0)this.wireframeLinecap=J.wireframeLinecap;if(J.wireframeLinejoin!==void 0)this.wireframeLinejoin=J.wireframeLinejoin;if(J.rotation!==void 0)this.rotation=J.rotation;if(J.linewidth!==void 0)this.linewidth=J.linewidth;if(J.linecap!==void 0)this.linecap=J.linecap;if(J.linejoin!==void 0)this.linejoin=J.linejoin;if(J.dashSize!==void 0)this.dashSize=J.dashSize;if(J.gapSize!==void 0)this.gapSize=J.gapSize;if(J.scale!==void 0)this.scale=J.scale;if(J.polygonOffset!==void 0)this.polygonOffset=J.polygonOffset;if(J.polygonOffsetFactor!==void 0)this.polygonOffsetFactor=J.polygonOffsetFactor;if(J.polygonOffsetUnits!==void 0)this.polygonOffsetUnits=J.polygonOffsetUnits;if(J.dithering!==void 0)this.dithering=J.dithering;if(J.alphaToCoverage!==void 0)this.alphaToCoverage=J.alphaToCoverage;if(J.premultipliedAlpha!==void 0)this.premultipliedAlpha=J.premultipliedAlpha;if(J.forceSinglePass!==void 0)this.forceSinglePass=J.forceSinglePass;if(J.allowOverride!==void 0)this.allowOverride=J.allowOverride;if(J.visible!==void 0)this.visible=J.visible;if(J.toneMapped!==void 0)this.toneMapped=J.toneMapped;if(J.userData!==void 0)this.userData=J.userData;if(J.vertexColors!==void 0)if(typeof J.vertexColors==="number")this.vertexColors=J.vertexColors>0;else this.vertexColors=J.vertexColors;if(J.size!==void 0)this.size=J.size;if(J.sizeAttenuation!==void 0)this.sizeAttenuation=J.sizeAttenuation;if(J.map!==void 0)this.map=Q[J.map]||null;if(J.matcap!==void 0)this.matcap=Q[J.matcap]||null;if(J.alphaMap!==void 0)this.alphaMap=Q[J.alphaMap]||null;if(J.bumpMap!==void 0)this.bumpMap=Q[J.bumpMap]||null;if(J.bumpScale!==void 0)this.bumpScale=J.bumpScale;if(J.normalMap!==void 0)this.normalMap=Q[J.normalMap]||null;if(J.normalMapType!==void 0)this.normalMapType=J.normalMapType;if(J.normalScale!==void 0){let $=J.normalScale;if(Array.isArray($)===!1)$=[$,$];this.normalScale=new w0().fromArray($)}if(J.displacementMap!==void 0)this.displacementMap=Q[J.displacementMap]||null;if(J.displacementScale!==void 0)this.displacementScale=J.displacementScale;if(J.displacementBias!==void 0)this.displacementBias=J.displacementBias;if(J.roughnessMap!==void 0)this.roughnessMap=Q[J.roughnessMap]||null;if(J.metalnessMap!==void 0)this.metalnessMap=Q[J.metalnessMap]||null;if(J.emissiveMap!==void 0)this.emissiveMap=Q[J.emissiveMap]||null;if(J.emissiveIntensity!==void 0)this.emissiveIntensity=J.emissiveIntensity;if(J.specularMap!==void 0)this.specularMap=Q[J.specularMap]||null;if(J.specularIntensityMap!==void 0)this.specularIntensityMap=Q[J.specularIntensityMap]||null;if(J.specularColorMap!==void 0)this.specularColorMap=Q[J.specularColorMap]||null;if(J.envMap!==void 0)this.envMap=Q[J.envMap]||null;if(J.envMapRotation!==void 0)this.envMapRotation.fromArray(J.envMapRotation);if(J.envMapIntensity!==void 0)this.envMapIntensity=J.envMapIntensity;if(J.reflectivity!==void 0)this.reflectivity=J.reflectivity;if(J.refractionRatio!==void 0)this.refractionRatio=J.refractionRatio;if(J.lightMap!==void 0)this.lightMap=Q[J.lightMap]||null;if(J.lightMapIntensity!==void 0)this.lightMapIntensity=J.lightMapIntensity;if(J.aoMap!==void 0)this.aoMap=Q[J.aoMap]||null;if(J.aoMapIntensity!==void 0)this.aoMapIntensity=J.aoMapIntensity;if(J.gradientMap!==void 0)this.gradientMap=Q[J.gradientMap]||null;if(J.clearcoatMap!==void 0)this.clearcoatMap=Q[J.clearcoatMap]||null;if(J.clearcoatRoughnessMap!==void 0)this.clearcoatRoughnessMap=Q[J.clearcoatRoughnessMap]||null;if(J.clearcoatNormalMap!==void 0)this.clearcoatNormalMap=Q[J.clearcoatNormalMap]||null;if(J.clearcoatNormalScale!==void 0)this.clearcoatNormalScale=new w0().fromArray(J.clearcoatNormalScale);if(J.iridescenceMap!==void 0)this.iridescenceMap=Q[J.iridescenceMap]||null;if(J.iridescenceThicknessMap!==void 0)this.iridescenceThicknessMap=Q[J.iridescenceThicknessMap]||null;if(J.transmissionMap!==void 0)this.transmissionMap=Q[J.transmissionMap]||null;if(J.thicknessMap!==void 0)this.thicknessMap=Q[J.thicknessMap]||null;if(J.anisotropyMap!==void 0)this.anisotropyMap=Q[J.anisotropyMap]||null;if(J.sheenColorMap!==void 0)this.sheenColorMap=Q[J.sheenColorMap]||null;if(J.sheenRoughnessMap!==void 0)this.sheenRoughnessMap=Q[J.sheenRoughnessMap]||null;return this}clone(){return new this.constructor().copy(this)}copy(J){this.name=J.name,this.blending=J.blending,this.side=J.side,this.vertexColors=J.vertexColors,this.opacity=J.opacity,this.transparent=J.transparent,this.blendSrc=J.blendSrc,this.blendDst=J.blendDst,this.blendEquation=J.blendEquation,this.blendSrcAlpha=J.blendSrcAlpha,this.blendDstAlpha=J.blendDstAlpha,this.blendEquationAlpha=J.blendEquationAlpha,this.blendColor.copy(J.blendColor),this.blendAlpha=J.blendAlpha,this.depthFunc=J.depthFunc,this.depthTest=J.depthTest,this.depthWrite=J.depthWrite,this.stencilWriteMask=J.stencilWriteMask,this.stencilFunc=J.stencilFunc,this.stencilRef=J.stencilRef,this.stencilFuncMask=J.stencilFuncMask,this.stencilFail=J.stencilFail,this.stencilZFail=J.stencilZFail,this.stencilZPass=J.stencilZPass,this.stencilWrite=J.stencilWrite;let Q=J.clippingPlanes,$=null;if(Q!==null){let Z=Q.length;$=Array(Z);for(let K=0;K!==Z;++K)$[K]=Q[K].clone()}return this.clippingPlanes=$,this.clipIntersection=J.clipIntersection,this.clipShadows=J.clipShadows,this.shadowSide=J.shadowSide,this.colorWrite=J.colorWrite,this.precision=J.precision,this.polygonOffset=J.polygonOffset,this.polygonOffsetFactor=J.polygonOffsetFactor,this.polygonOffsetUnits=J.polygonOffsetUnits,this.dithering=J.dithering,this.alphaTest=J.alphaTest,this.alphaHash=J.alphaHash,this.alphaToCoverage=J.alphaToCoverage,this.premultipliedAlpha=J.premultipliedAlpha,this.forceSinglePass=J.forceSinglePass,this.allowOverride=J.allowOverride,this.visible=J.visible,this.toneMapped=J.toneMapped,this.userData=JSON.parse(JSON.stringify(J.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(J){if(J===!0)this.version++}}var A9=new f,x6=new f,_7=new f,T7=new f;class p8{constructor(J=new f,Q=new f(0,0,-1)){this.origin=J,this.direction=Q}set(J,Q){return this.origin.copy(J),this.direction.copy(Q),this}copy(J){return this.origin.copy(J.origin),this.direction.copy(J.direction),this}at(J,Q){return Q.copy(this.origin).addScaledVector(this.direction,J)}lookAt(J){return this.direction.copy(J).sub(this.origin).normalize(),this}recast(J){return this.origin.copy(this.at(J,A9)),this}closestPointToPoint(J,Q){Q.subVectors(J,this.origin);let $=Q.dot(this.direction);if($<0)return Q.copy(this.origin);return Q.copy(this.origin).addScaledVector(this.direction,$)}distanceToPoint(J){return Math.sqrt(this.distanceSqToPoint(J))}distanceSqToPoint(J){let Q=A9.subVectors(J,this.origin).dot(this.direction);if(Q<0)return this.origin.distanceToSquared(J);return A9.copy(this.origin).addScaledVector(this.direction,Q),A9.distanceToSquared(J)}distanceSqToSegment(J,Q,$,Z){x6.copy(J).add(Q).multiplyScalar(0.5),_7.copy(Q).sub(J).normalize(),T7.copy(this.origin).sub(x6);let K=J.distanceTo(Q)*0.5,W=-this.direction.dot(_7),H=T7.dot(this.direction),Y=-T7.dot(_7),X=T7.lengthSq(),U=Math.abs(1-W*W),N,q,G,D;if(U>0)if(N=W*Y-H,q=W*H-Y,D=K*U,N>=0)if(q>=-D)if(q<=D){let M=1/U;N*=M,q*=M,G=N*(N+W*q+2*H)+q*(W*N+q+2*Y)+X}else q=K,N=Math.max(0,-(W*q+H)),G=-N*N+q*(q+2*Y)+X;else q=-K,N=Math.max(0,-(W*q+H)),G=-N*N+q*(q+2*Y)+X;else if(q<=-D)N=Math.max(0,-(-W*K+H)),q=N>0?-K:Math.min(Math.max(-K,-Y),K),G=-N*N+q*(q+2*Y)+X;else if(q<=D)N=0,q=Math.min(Math.max(-K,-Y),K),G=q*(q+2*Y)+X;else N=Math.max(0,-(W*K+H)),q=N>0?K:Math.min(Math.max(-K,-Y),K),G=-N*N+q*(q+2*Y)+X;else q=W>0?-K:K,N=Math.max(0,-(W*q+H)),G=-N*N+q*(q+2*Y)+X;if($)$.copy(this.origin).addScaledVector(this.direction,N);if(Z)Z.copy(x6).addScaledVector(_7,q);return G}intersectSphere(J,Q){if(J.radius<0)return null;A9.subVectors(J.center,this.origin);let $=A9.dot(this.direction),Z=A9.dot(A9)-$*$,K=J.radius*J.radius;if(Z>K)return null;let W=Math.sqrt(K-Z),H=$-W,Y=$+W;if(Y<0)return null;if(H<0)return this.at(Y,Q);return this.at(H,Q)}intersectsSphere(J){if(J.radius<0)return!1;return this.distanceSqToPoint(J.center)<=J.radius*J.radius}distanceToPlane(J){let Q=J.normal.dot(this.direction);if(Q===0){if(J.distanceToPoint(this.origin)===0)return 0;return null}let $=-(this.origin.dot(J.normal)+J.constant)/Q;return $>=0?$:null}intersectPlane(J,Q){let $=this.distanceToPlane(J);if($===null)return null;return this.at($,Q)}intersectsPlane(J){let Q=J.distanceToPoint(this.origin);if(Q===0)return!0;if(J.normal.dot(this.direction)*Q<0)return!0;return!1}intersectBox(J,Q){let $,Z,K,W,H,Y,X=1/this.direction.x,U=1/this.direction.y,N=1/this.direction.z,q=this.origin;if(X>=0)$=(J.min.x-q.x)*X,Z=(J.max.x-q.x)*X;else $=(J.max.x-q.x)*X,Z=(J.min.x-q.x)*X;if(U>=0)K=(J.min.y-q.y)*U,W=(J.max.y-q.y)*U;else K=(J.max.y-q.y)*U,W=(J.min.y-q.y)*U;if($>W||K>Z)return null;if(K>$||isNaN($))$=K;if(W<Z||isNaN(Z))Z=W;if(N>=0)H=(J.min.z-q.z)*N,Y=(J.max.z-q.z)*N;else H=(J.max.z-q.z)*N,Y=(J.min.z-q.z)*N;if($>Y||H>Z)return null;if(H>$||$!==$)$=H;if(Y<Z||Z!==Z)Z=Y;if(Z<0)return null;return this.at($>=0?$:Z,Q)}intersectsBox(J){return this.intersectBox(J,A9)!==null}intersectTriangle(J,Q,$,Z,K){let W=this.origin,H=this.direction,Y=H.x,X=H.y,U=H.z,N=J.x-W.x,q=J.y-W.y,G=J.z-W.z,D=Q.x-W.x,M=Q.y-W.y,I=Q.z-W.z,F=$.x-W.x,E=$.y-W.y,A=$.z-W.z,_=Math.abs(Y),V=Math.abs(X),z=Math.abs(U),C,P,L,B,l,v,h,r,j,d,o,m;if(_>=V&&_>=z)if(L=Y,v=N,j=D,m=F,Y>=0)C=X,P=U,B=q,l=G,h=M,r=I,d=E,o=A;else C=U,P=X,B=G,l=q,h=I,r=M,d=A,o=E;else if(V>=z)if(L=X,v=q,j=M,m=E,X>=0)C=U,P=Y,B=G,l=N,h=I,r=D,d=A,o=F;else C=Y,P=U,B=N,l=G,h=D,r=I,d=F,o=A;else if(L=U,v=G,j=I,m=A,U>=0)C=Y,P=X,B=N,l=q,h=D,r=M,d=F,o=E;else C=X,P=Y,B=q,l=N,h=M,r=D,d=E,o=F;if(L===0)return null;let Q0=C/L,c=P/L,a=1/L,J0=B-Q0*v,_0=l-c*v,z0=h-Q0*j,QJ=r-c*j,h0=d-Q0*m,n=o-c*m,$0=h0*QJ-n*z0,K0=J0*n-_0*h0,A0=z0*_0-QJ*J0;if(Z){if($0<0||K0<0||A0<0)return null}else if(($0<0||K0<0||A0<0)&&($0>0||K0>0||A0>0))return null;let T0=$0+K0+A0;if(T0===0)return null;let B0=a*($0*v+K0*j+A0*m);if(T0>0?B0<0:B0>0)return null;return this.at(B0/T0,K)}applyMatrix4(J){return this.origin.applyMatrix4(J),this.direction.transformDirection(J),this}equals(J){return J.origin.equals(this.origin)&&J.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class $8 extends g8{constructor(J){super();this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new g0(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new x9,this.combine=0,this.reflectivity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.fog=J.fog,this}}var GZ=new KJ,s9=new p8,S7=new G7,NZ=new f,j7=new f,y7=new f,f7=new f,g6=new f,v7=new f,qZ=new f,h7=new f;class zJ extends _J{constructor(J=new gJ,Q=new $8){super();this.isMesh=!0,this.type="Mesh",this.geometry=J,this.material=Q,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(J,Q){if(super.copy(J,Q),J.morphTargetInfluences!==void 0)this.morphTargetInfluences=J.morphTargetInfluences.slice();if(J.morphTargetDictionary!==void 0)this.morphTargetDictionary=Object.assign({},J.morphTargetDictionary);return this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}updateMorphTargets(){let Q=this.geometry.morphAttributes,$=Object.keys(Q);if($.length>0){let Z=Q[$[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let K=0,W=Z.length;K<W;K++){let H=Z[K].name||String(K);this.morphTargetInfluences.push(0),this.morphTargetDictionary[H]=K}}}}getVertexPosition(J,Q){let $=this.geometry,Z=$.attributes.position,K=$.morphAttributes.position,W=$.morphTargetsRelative;Q.fromBufferAttribute(Z,J);let H=this.morphTargetInfluences;if(K&&H){v7.set(0,0,0);for(let Y=0,X=K.length;Y<X;Y++){let U=H[Y],N=K[Y];if(U===0)continue;if(g6.fromBufferAttribute(N,J),W)v7.addScaledVector(g6,U);else v7.addScaledVector(g6.sub(Q),U)}Q.add(v7)}return Q}intersectsFrustum(J){return J.intersectsObject(this)}raycast(J,Q){let $=this.geometry,Z=this.material,K=this.matrixWorld;if(Z===void 0)return;if($.boundingSphere===null)$.computeBoundingSphere();if(S7.copy($.boundingSphere),S7.applyMatrix4(K),s9.copy(J.ray).recast(J.near),S7.containsPoint(s9.origin)===!1){if(s9.intersectSphere(S7,NZ)===null)return;if(s9.origin.distanceToSquared(NZ)>(J.far-J.near)**2)return}if(GZ.copy(K).invert(),s9.copy(J.ray).applyMatrix4(GZ),$.boundingBox!==null){if(s9.intersectsBox($.boundingBox)===!1)return}this._computeIntersections(J,Q,s9)}_computeIntersections(J,Q,$){let Z,K=this.geometry,W=this.material,H=K.index,Y=K.attributes.position,X=K.attributes.uv,U=K.attributes.uv1,N=K.attributes.normal,q=K.groups,G=K.drawRange;if(H!==null)if(Array.isArray(W))for(let D=0,M=q.length;D<M;D++){let I=q[D],F=W[I.materialIndex],E=Math.max(I.start,G.start),A=Math.min(H.count,Math.min(I.start+I.count,G.start+G.count));for(let _=E,V=A;_<V;_+=3){let z=H.getX(_),C=H.getX(_+1),P=H.getX(_+2);if(Z=b7(this,F,J,$,X,U,N,z,C,P),Z)Z.faceIndex=Math.floor(_/3),Z.face.materialIndex=I.materialIndex,Q.push(Z)}}else{let D=Math.max(0,G.start),M=Math.min(H.count,G.start+G.count);for(let I=D,F=M;I<F;I+=3){let E=H.getX(I),A=H.getX(I+1),_=H.getX(I+2);if(Z=b7(this,W,J,$,X,U,N,E,A,_),Z)Z.faceIndex=Math.floor(I/3),Q.push(Z)}}else if(Y!==void 0)if(Array.isArray(W))for(let D=0,M=q.length;D<M;D++){let I=q[D],F=W[I.materialIndex],E=Math.max(I.start,G.start),A=Math.min(Y.count,Math.min(I.start+I.count,G.start+G.count));for(let _=E,V=A;_<V;_+=3){let z=_,C=_+1,P=_+2;if(Z=b7(this,F,J,$,X,U,N,z,C,P),Z)Z.faceIndex=Math.floor(_/3),Z.face.materialIndex=I.materialIndex,Q.push(Z)}}else{let D=Math.max(0,G.start),M=Math.min(Y.count,G.start+G.count);for(let I=D,F=M;I<F;I+=3){let E=I,A=I+1,_=I+2;if(Z=b7(this,W,J,$,X,U,N,E,A,_),Z)Z.faceIndex=Math.floor(I/3),Q.push(Z)}}}}function AH(J,Q,$,Z,K,W,H,Y){let X;if(Q.side===1)X=Z.intersectTriangle(H,W,K,!0,Y);else X=Z.intersectTriangle(K,W,H,Q.side===0,Y);if(X===null)return null;h7.copy(Y),h7.applyMatrix4(J.matrixWorld);let U=$.ray.origin.distanceTo(h7);if(U<$.near||U>$.far)return null;return{distance:U,point:h7.clone(),object:J}}function b7(J,Q,$,Z,K,W,H,Y,X,U){J.getVertexPosition(Y,j7),J.getVertexPosition(X,y7),J.getVertexPosition(U,f7);let N=AH(J,Q,$,Z,j7,y7,f7,qZ);if(N){let q=new f;if(aJ.getBarycoord(qZ,j7,y7,f7,q),K)N.uv=aJ.getInterpolatedAttribute(K,Y,X,U,q,new w0);if(W)N.uv1=aJ.getInterpolatedAttribute(W,Y,X,U,q,new w0);if(H){if(N.normal=aJ.getInterpolatedAttribute(H,Y,X,U,q,new f),N.normal.dot(Z.direction)>0)N.normal.multiplyScalar(-1)}let G={a:Y,b:X,c:U,normal:new f,materialIndex:0};aJ.getNormal(j7,y7,f7,G.normal),N.face=G,N.barycoord=q}return N}class sQ extends wJ{constructor(J=null,Q=1,$=1,Z,K,W,H,Y,X=1003,U=1003,N,q){super(null,W,H,Y,X,U,Z,K,N,q);this.isDataTexture=!0,this.image={data:J,width:Q,height:$},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}var i9=new G7,CH=new w0(0.5,0.5),x7=new f;class Z6{constructor(J=new oJ,Q=new oJ,$=new oJ,Z=new oJ,K=new oJ,W=new oJ){this.planes=[J,Q,$,Z,K,W]}set(J,Q,$,Z,K,W){let H=this.planes;return H[0].copy(J),H[1].copy(Q),H[2].copy($),H[3].copy(Z),H[4].copy(K),H[5].copy(W),this}copy(J){let Q=this.planes;for(let $=0;$<6;$++)Q[$].copy(J.planes[$]);return this}setFromProjectionMatrix(J,Q=2000,$=!1){let Z=this.planes,K=J.elements,W=K[0],H=K[1],Y=K[2],X=K[3],U=K[4],N=K[5],q=K[6],G=K[7],D=K[8],M=K[9],I=K[10],F=K[11],E=K[12],A=K[13],_=K[14],V=K[15];if(Z[0].setComponents(X-W,G-U,F-D,V-E).normalize(),Z[1].setComponents(X+W,G+U,F+D,V+E).normalize(),Z[2].setComponents(X+H,G+N,F+M,V+A).normalize(),Z[3].setComponents(X-H,G-N,F-M,V-A).normalize(),$)Z[4].setComponents(Y,q,I,_).normalize(),Z[5].setComponents(X-Y,G-q,F-I,V-_).normalize();else if(Z[4].setComponents(X-Y,G-q,F-I,V-_).normalize(),Q===2000)Z[5].setComponents(X+Y,G+q,F+I,V+_).normalize();else if(Q===2001)Z[5].setComponents(Y,q,I,_).normalize();else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+Q);return this}intersectsObject(J){if(J.boundingSphere!==void 0){if(J.boundingSphere===null)J.computeBoundingSphere();i9.copy(J.boundingSphere).applyMatrix4(J.matrixWorld)}else{let Q=J.geometry;if(Q.boundingSphere===null)Q.computeBoundingSphere();i9.copy(Q.boundingSphere).applyMatrix4(J.matrixWorld)}return this.intersectsSphere(i9)}intersectsSprite(J){i9.center.set(0,0,0);let Q=CH.distanceTo(J.center);return i9.radius=0.7071067811865476+Q,i9.applyMatrix4(J.matrixWorld),this.intersectsSphere(i9)}intersectsSphere(J){let Q=this.planes,$=J.center,Z=-J.radius;for(let K=0;K<6;K++)if(Q[K].distanceToPoint($)<Z)return!1;return!0}intersectsBox(J){let Q=this.planes;for(let $=0;$<6;$++){let Z=Q[$];if(x7.x=Z.normal.x>0?J.max.x:J.min.x,x7.y=Z.normal.y>0?J.max.y:J.min.y,x7.z=Z.normal.z>0?J.max.z:J.min.z,Z.distanceToPoint(x7)<0)return!1}return!0}containsPoint(J){let Q=this.planes;for(let $=0;$<6;$++)if(Q[$].distanceToPoint(J)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class K6 extends wJ{constructor(J=[],Q=301,$,Z,K,W,H,Y,X,U){super(J,Q,$,Z,K,W,H,Y,X,U);this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(J){this.image=J}}class Z8 extends wJ{constructor(J,Q,$=1014,Z,K,W,H=1003,Y=1003,X,U=1026,N=1){if(U!==1026&&U!==1027)throw Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let q={width:J,height:Q,depth:N};super(q,Z,K,W,H,Y,U,$,X);this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(J){return super.copy(J),this.source=new Y7(Object.assign({},J.image)),this.compareFunction=J.compareFunction,this}toJSON(J){let Q=super.toJSON(J);return Q.compareFunction=this.compareFunction,Q}}class iQ extends Z8{constructor(J,Q=1014,$=301,Z,K,W=1003,H=1003,Y,X=1026){let U={width:J,height:J,depth:1},N=[U,U,U,U,U,U];super(J,J,Q,$,Z,K,W,H,Y,X);this.image=N,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(J){this.image=J}}class W6 extends wJ{constructor(J=null){super();this.sourceTexture=J,this.isExternalTexture=!0}copy(J){return super.copy(J),this.sourceTexture=J.sourceTexture,this}}class l9 extends gJ{constructor(J=1,Q=1,$=1,Z=1,K=1,W=1){super();this.type="BoxGeometry",this.parameters={width:J,height:Q,depth:$,widthSegments:Z,heightSegments:K,depthSegments:W};let H=this;Z=Math.floor(Z),K=Math.floor(K),W=Math.floor(W);let Y=[],X=[],U=[],N=[],q=0,G=0;D("z","y","x",-1,-1,$,Q,J,W,K,0),D("z","y","x",1,-1,$,Q,-J,W,K,1),D("x","z","y",1,1,J,$,Q,Z,W,2),D("x","z","y",1,-1,J,$,-Q,Z,W,3),D("x","y","z",1,-1,J,Q,$,Z,K,4),D("x","y","z",-1,-1,J,Q,-$,Z,K,5),this.setIndex(Y),this.setAttribute("position",new IJ(X,3)),this.setAttribute("normal",new IJ(U,3)),this.setAttribute("uv",new IJ(N,2));function D(M,I,F,E,A,_,V,z,C,P,L){let B=_/C,l=V/P,v=_/2,h=V/2,r=z/2,j=C+1,d=P+1,o=0,m=0,Q0=new f;for(let c=0;c<d;c++){let a=c*l-h;for(let J0=0;J0<j;J0++){let _0=J0*B-v;Q0[M]=_0*E,Q0[I]=a*A,Q0[F]=r,X.push(Q0.x,Q0.y,Q0.z),Q0[M]=0,Q0[I]=0,Q0[F]=z>0?1:-1,U.push(Q0.x,Q0.y,Q0.z),N.push(J0/C),N.push(1-c/P),o+=1}}for(let c=0;c<P;c++)for(let a=0;a<C;a++){let J0=q+a+j*c,_0=q+a+j*(c+1),z0=q+(a+1)+j*(c+1),QJ=q+(a+1)+j*c;Y.push(J0,_0,QJ),Y.push(_0,z0,QJ),m+=6}H.addGroup(G,m,L),G+=m,q+=o}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new l9(J.width,J.height,J.depth,J.widthSegments,J.heightSegments,J.depthSegments)}}class K8 extends gJ{constructor(J=1,Q=1,$=1,Z=1){super();this.type="PlaneGeometry",this.parameters={width:J,height:Q,widthSegments:$,heightSegments:Z};let K=J/2,W=Q/2,H=Math.floor($),Y=Math.floor(Z),X=H+1,U=Y+1,N=J/H,q=Q/Y,G=[],D=[],M=[],I=[];for(let F=0;F<U;F++){let E=F*q-W;for(let A=0;A<X;A++){let _=A*N-K;D.push(_,-E,0),M.push(0,0,1),I.push(A/H),I.push(1-F/Y)}}for(let F=0;F<Y;F++)for(let E=0;E<H;E++){let A=E+X*F,_=E+X*(F+1),V=E+1+X*(F+1),z=E+1+X*F;G.push(A,_,z),G.push(_,V,z)}this.setIndex(G),this.setAttribute("position",new IJ(D,3)),this.setAttribute("normal",new IJ(M,3)),this.setAttribute("uv",new IJ(I,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new K8(J.width,J.height,J.widthSegments,J.heightSegments)}}class N7 extends gJ{constructor(J=1,Q=32,$=16,Z=0,K=Math.PI*2,W=0,H=Math.PI){super();this.type="SphereGeometry",this.parameters={radius:J,widthSegments:Q,heightSegments:$,phiStart:Z,phiLength:K,thetaStart:W,thetaLength:H},Q=Math.max(3,Math.floor(Q)),$=Math.max(2,Math.floor($));let Y=Math.min(W+H,Math.PI),X=0,U=[],N=new f,q=new f,G=[],D=[],M=[],I=[];for(let F=0;F<=$;F++){let E=[],A=F/$,_=W+A*H,V=J*Math.cos(_),z=Math.sqrt(J*J-V*V),C=0;if(F===0&&W===0)C=0.5/Q;else if(F===$&&Y===Math.PI)C=-0.5/Q;for(let P=0;P<=Q;P++){let L=P/Q,B=Z+L*K;N.x=-z*Math.cos(B),N.y=V,N.z=z*Math.sin(B),D.push(N.x,N.y,N.z),q.copy(N).normalize(),M.push(q.x,q.y,q.z),I.push(L+C,1-A),E.push(X++)}U.push(E)}for(let F=0;F<$;F++)for(let E=0;E<Q;E++){let A=U[F][E+1],_=U[F][E],V=U[F+1][E],z=U[F+1][E+1];if(F!==0||W>0)G.push(A,_,z);if(F!==$-1||Y<Math.PI)G.push(_,V,z)}this.setIndex(G),this.setAttribute("position",new IJ(D,3)),this.setAttribute("normal",new IJ(M,3)),this.setAttribute("uv",new IJ(I,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new N7(J.radius,J.widthSegments,J.heightSegments,J.phiStart,J.phiLength,J.thetaStart,J.thetaLength)}}function W8(J){let Q={};for(let $ in J){Q[$]={};for(let Z in J[$]){let K=J[$][Z];if(EZ(K))if(K.isRenderTargetTexture)P0("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),Q[$][Z]=null;else Q[$][Z]=K.clone();else if(Array.isArray(K))if(EZ(K[0])){let W=[];for(let H=0,Y=K.length;H<Y;H++)W[H]=K[H].clone();Q[$][Z]=W}else Q[$][Z]=K.slice();else Q[$][Z]=K}}return Q}function TJ(J){let Q={};for(let $=0;$<J.length;$++){let Z=W8(J[$]);for(let K in Z)Q[K]=Z[K]}return Q}function EZ(J){return J&&(J.isColor||J.isMatrix3||J.isMatrix4||J.isVector2||J.isVector3||J.isVector4||J.isTexture||J.isQuaternion)}function PH(J){let Q=[];for(let $=0;$<J.length;$++)Q.push(J[$].clone());return Q}function oQ(J){let Q=J.getRenderTarget();if(Q===null)return J.outputColorSpace;if(Q.isXRRenderTarget===!0)return Q.texture.colorSpace;return m0.workingColorSpace}var BK={clone:W8,merge:TJ},wH=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,_H=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class SJ extends g8{constructor(J){super();if(this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=wH,this.fragmentShader=_H,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,J!==void 0)this.setValues(J)}copy(J){return super.copy(J),this.fragmentShader=J.fragmentShader,this.vertexShader=J.vertexShader,this.uniforms=W8(J.uniforms),this.uniformsGroups=PH(J.uniformsGroups),this.defines=Object.assign({},J.defines),this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.fog=J.fog,this.lights=J.lights,this.clipping=J.clipping,this.extensions=Object.assign({},J.extensions),this.glslVersion=J.glslVersion,this.defaultAttributeValues=Object.assign({},J.defaultAttributeValues),this.index0AttributeName=J.index0AttributeName,this.uniformsNeedUpdate=J.uniformsNeedUpdate,this}toJSON(J){let Q=super.toJSON(J);Q.glslVersion=this.glslVersion,Q.uniforms={};for(let Z in this.uniforms){let W=this.uniforms[Z].value;if(W&&W.isTexture)Q.uniforms[Z]={type:"t",value:W.toJSON(J).uuid};else if(W&&W.isColor)Q.uniforms[Z]={type:"c",value:W.getHex()};else if(W&&W.isVector2)Q.uniforms[Z]={type:"v2",value:W.toArray()};else if(W&&W.isVector3)Q.uniforms[Z]={type:"v3",value:W.toArray()};else if(W&&W.isVector4)Q.uniforms[Z]={type:"v4",value:W.toArray()};else if(W&&W.isMatrix3)Q.uniforms[Z]={type:"m3",value:W.toArray()};else if(W&&W.isMatrix4)Q.uniforms[Z]={type:"m4",value:W.toArray()};else Q.uniforms[Z]={value:W}}if(Object.keys(this.defines).length>0)Q.defines=this.defines;Q.vertexShader=this.vertexShader,Q.fragmentShader=this.fragmentShader,Q.lights=this.lights,Q.clipping=this.clipping;let $={};for(let Z in this.extensions)if(this.extensions[Z]===!0)$[Z]=!0;if(Object.keys($).length>0)Q.extensions=$;return Q}fromJSON(J,Q){if(super.fromJSON(J,Q),J.uniforms!==void 0)for(let $ in J.uniforms){let Z=J.uniforms[$];switch(this.uniforms[$]={},Z.type){case"t":this.uniforms[$].value=Q[Z.value]||null;break;case"c":this.uniforms[$].value=new g0().setHex(Z.value);break;case"v2":this.uniforms[$].value=new w0().fromArray(Z.value);break;case"v3":this.uniforms[$].value=new f().fromArray(Z.value);break;case"v4":this.uniforms[$].value=new UJ().fromArray(Z.value);break;case"m3":this.uniforms[$].value=new j0().fromArray(Z.value);break;case"m4":this.uniforms[$].value=new KJ().fromArray(Z.value);break;default:this.uniforms[$].value=Z.value}}if(J.defines!==void 0)this.defines=J.defines;if(J.vertexShader!==void 0)this.vertexShader=J.vertexShader;if(J.fragmentShader!==void 0)this.fragmentShader=J.fragmentShader;if(J.glslVersion!==void 0)this.glslVersion=J.glslVersion;if(J.extensions!==void 0)for(let $ in J.extensions)this.extensions[$]=J.extensions[$];if(J.lights!==void 0)this.lights=J.lights;if(J.clipping!==void 0)this.clipping=J.clipping;return this}}class aQ extends SJ{constructor(J){super(J);this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class rQ extends g8{constructor(J){super();this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(J)}copy(J){return super.copy(J),this.depthPacking=J.depthPacking,this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this}}class tQ extends g8{constructor(J){super();this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(J)}copy(J){return super.copy(J),this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this}}function A8(J,Q){if(!J||J.constructor===Q)return J;if(typeof Q.BYTES_PER_ELEMENT==="number")return new Q(J);return Array.prototype.slice.call(J)}function p6(J){return J!==void 0&&J.inTangents!==void 0&&J.outTangents!==void 0}class H8{constructor(J,Q,$,Z){this.parameterPositions=J,this._cachedIndex=0,this.resultBuffer=Z!==void 0?Z:new Q.constructor($),this.sampleValues=Q,this.valueSize=$,this.settings=null,this.DefaultSettings_={}}evaluate(J){let Q=this.parameterPositions,$=this._cachedIndex,Z=Q[$],K=Q[$-1];$:{J:{let W;Q:{Z:if(!(J<Z)){for(let H=$+2;;){if(Z===void 0){if(J<K)break Z;return $=Q.length,this._cachedIndex=$,this.copySampleValue_($-1)}if($===H)break;if(K=Z,Z=Q[++$],J<Z)break J}W=Q.length;break Q}if(!(J>=K)){let H=Q[1];if(J<H)$=2,K=H;for(let Y=$-2;;){if(K===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if($===Y)break;if(Z=K,K=Q[--$-1],J>=K)break J}W=$,$=0;break Q}break $}while($<W){let H=$+W>>>1;if(J<Q[H])W=H;else $=H+1}if(Z=Q[$],K=Q[$-1],K===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(Z===void 0)return $=Q.length,this._cachedIndex=$,this.copySampleValue_($-1)}this._cachedIndex=$,this.intervalChanged_($,K,Z)}return this.interpolate_($,K,J,Z)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(J){let Q=this.resultBuffer,$=this.sampleValues,Z=this.valueSize,K=J*Z;for(let W=0;W!==Z;++W)Q[W]=$[K+W];return Q}interpolate_(){throw Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}}class eQ extends H8{constructor(J,Q,$,Z){super(J,Q,$,Z);this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:2400,endingEnd:2400}}intervalChanged_(J,Q,$){let Z=this.parameterPositions,K=J-2,W=J+1,H=Z[K],Y=Z[W];if(H===void 0)switch(this.getSettings_().endingStart){case 2401:K=J,H=2*Q-$;break;case 2402:K=Z.length-2,H=Q+Z[K]-Z[K+1];break;default:K=J,H=$}if(Y===void 0)switch(this.getSettings_().endingEnd){case 2401:W=J,Y=2*$-Q;break;case 2402:W=1,Y=$+Z[1]-Z[0];break;default:W=J-1,Y=Q}let X=($-Q)*0.5,U=this.valueSize;this._weightPrev=X/(Q-H),this._weightNext=X/(Y-$),this._offsetPrev=K*U,this._offsetNext=W*U}interpolate_(J,Q,$,Z){let K=this.resultBuffer,W=this.sampleValues,H=this.valueSize,Y=J*H,X=Y-H,U=this._offsetPrev,N=this._offsetNext,q=this._weightPrev,G=this._weightNext,D=($-Q)/(Z-Q),M=D*D,I=M*D,F=-q*I+2*q*M-q*D,E=(1+q)*I+(-1.5-2*q)*M+(-0.5+q)*D+1,A=(-1-G)*I+(1.5+G)*M+0.5*D,_=G*I-G*M;for(let V=0;V!==H;++V)K[V]=F*W[U+V]+E*W[X+V]+A*W[Y+V]+_*W[N+V];return K}}class J$ extends H8{constructor(J,Q,$,Z){super(J,Q,$,Z)}interpolate_(J,Q,$,Z){let K=this.resultBuffer,W=this.sampleValues,H=this.valueSize,Y=J*H,X=Y-H,U=($-Q)/(Z-Q),N=1-U;for(let q=0;q!==H;++q)K[q]=W[X+q]*N+W[Y+q]*U;return K}}class Q$ extends H8{constructor(J,Q,$,Z){super(J,Q,$,Z)}interpolate_(J){return this.copySampleValue_(J-1)}}class $$ extends H8{interpolate_(J,Q,$,Z){let K=this.resultBuffer,W=this.sampleValues,H=this.valueSize,Y=J*H,X=Y-H,U=this.inTangents,N=this.outTangents;if(!U||!N){let D=($-Q)/(Z-Q),M=1-D;for(let I=0;I!==H;++I)K[I]=W[X+I]*M+W[Y+I]*D;return K}let q=H*2,G=J-1;for(let D=0;D!==H;++D){let M=W[X+D],I=W[Y+D],F=G*q+D*2,E=N[F],A=N[F+1],_=J*q+D*2,V=U[_],z=U[_+1],C=SH($,Q,E,V,Z);K[D]=IK(C,M,A,z,I)}return K}}function IK(J,Q,$,Z,K){let W=1-J;return W*W*W*Q+3*W*W*J*$+3*W*J*J*Z+J*J*J*K}function TH(J,Q,$,Z,K){let W=1-J;return 3*W*W*($-Q)+6*W*J*(Z-$)+3*J*J*(K-Z)}function SH(J,Q,$,Z,K){let W=(J-Q)/(K-Q);for(let H=0;H<8;H++){let Y=IK(W,Q,$,Z,K)-J;if(Math.abs(Y)<0.0000000001)break;let X=TH(W,Q,$,Z,K);if(Math.abs(X)<0.0000000001)break;W=Math.max(0,Math.min(1,W-Y/X))}return W}class eJ{constructor(J,Q,$,Z){if(J===void 0)throw Error("THREE.KeyframeTrack: track name is undefined");if(Q===void 0||Q.length===0)throw Error("THREE.KeyframeTrack: no keyframes in track named "+J);this.name=J,this.times=A8(Q,this.TimeBufferType),this.values=A8($,this.ValueBufferType),this.setInterpolation(Z||this.DefaultInterpolation)}static toJSON(J){let Q=J.constructor,$;if(Q.toJSON!==this.toJSON)$=Q.toJSON(J);else{$={name:J.name,times:A8(J.times,Array),values:A8(J.values,Array)};let Z=J.getInterpolation();if(Z!==J.DefaultInterpolation)$.interpolation=Z;if(p6(J.settings))$.settings={inTangents:A8(J.settings.inTangents,Array),outTangents:A8(J.settings.outTangents,Array)}}return $.type=J.ValueTypeName,$}InterpolantFactoryMethodDiscrete(J){return new Q$(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodLinear(J){return new J$(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodSmooth(J){return new eQ(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodBezier(J){let Q=new $$(this.times,this.values,this.getValueSize(),J);if(this.settings)Q.inTangents=this.settings.inTangents,Q.outTangents=this.settings.outTangents;return Q}setInterpolation(J){let Q;switch(J){case 2300:Q=this.InterpolantFactoryMethodDiscrete;break;case 2301:Q=this.InterpolantFactoryMethodLinear;break;case 2302:Q=this.InterpolantFactoryMethodSmooth;break;case 2303:Q=this.InterpolantFactoryMethodBezier;break}if(Q===void 0){let $="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(J!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error($);return P0("KeyframeTrack:",$),this}return this.createInterpolant=Q,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302;case this.InterpolantFactoryMethodBezier:return 2303}}getValueSize(){return this.values.length/this.times.length}shift(J){if(J!==0){let Q=this.times;for(let $=0,Z=Q.length;$!==Z;++$)Q[$]+=J}return this}scale(J){if(J!==1){let Q=this.times;for(let $=0,Z=Q.length;$!==Z;++$)Q[$]*=J;if(p6(this.settings))FZ(this.settings.inTangents,J),FZ(this.settings.outTangents,J)}return this}trim(J,Q){let $=this.times,Z=$.length,K=0,W=Z-1;while(K!==Z&&$[K]<J)++K;while(W!==-1&&$[W]>Q)--W;if(++W,K!==0||W!==Z){if(K>=W)W=Math.max(W,1),K=W-1;let H=this.getValueSize();this.times=$.slice(K,W),this.values=this.values.slice(K*H,W*H)}return this}validate(){let J=!0,Q=this.getValueSize();if(Q-Math.floor(Q)!==0)S0("KeyframeTrack: Invalid value size in track.",this),J=!1;let $=this.times,Z=this.values,K=$.length;if(K===0)S0("KeyframeTrack: Track is empty.",this),J=!1;let W=null;for(let H=0;H!==K;H++){let Y=$[H];if(typeof Y==="number"&&isNaN(Y)){S0("KeyframeTrack: Time is not a valid number.",this,H,Y),J=!1;break}if(W!==null&&W>Y){S0("KeyframeTrack: Out of order keys.",this,H,Y,W),J=!1;break}W=Y}if(Z!==void 0){if(nW(Z))for(let H=0,Y=Z.length;H!==Y;++H){let X=Z[H];if(isNaN(X)){S0("KeyframeTrack: Value is not a valid number.",this,H,X),J=!1;break}}}return J}optimize(){let J=this.times.slice(),Q=this.values.slice(),$=this.getValueSize(),Z=this.getInterpolation()===2302,K=J.length-1,W=1;for(let H=1;H<K;++H){let Y=!1,X=J[H],U=J[H+1];if(X!==U&&(H!==1||X!==J[0]))if(!Z){let N=H*$,q=N-$,G=N+$;for(let D=0;D!==$;++D){let M=Q[N+D];if(M!==Q[q+D]||M!==Q[G+D]){Y=!0;break}}}else Y=!0;if(Y){if(H!==W){J[W]=J[H];let N=H*$,q=W*$;for(let G=0;G!==$;++G)Q[q+G]=Q[N+G]}++W}}if(K>0){J[W]=J[K];for(let H=K*$,Y=W*$,X=0;X!==$;++X)Q[Y+X]=Q[H+X];++W}if(W!==J.length)this.times=J.slice(0,W),this.values=Q.slice(0,W*$);else this.times=J,this.values=Q;return this}clone(){let J=this.times.slice(),Q=this.values.slice(),Z=new this.constructor(this.name,J,Q);if(Z.createInterpolant=this.createInterpolant,p6(this.settings))Z.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()};return Z}}function FZ(J,Q){for(let $=0,Z=J.length;$!==Z;$+=2)J[$]*=Q}eJ.prototype.ValueTypeName="";eJ.prototype.TimeBufferType=Float32Array;eJ.prototype.ValueBufferType=Float32Array;eJ.prototype.DefaultInterpolation=2301;class Y8 extends eJ{constructor(J,Q,$){super(J,Q,$)}}Y8.prototype.ValueTypeName="bool";Y8.prototype.ValueBufferType=Array;Y8.prototype.DefaultInterpolation=2300;Y8.prototype.InterpolantFactoryMethodLinear=void 0;Y8.prototype.InterpolantFactoryMethodSmooth=void 0;class Z$ extends eJ{constructor(J,Q,$,Z){super(J,Q,$,Z)}}Z$.prototype.ValueTypeName="color";class K$ extends eJ{constructor(J,Q,$,Z){super(J,Q,$,Z)}}K$.prototype.ValueTypeName="number";class W$ extends H8{constructor(J,Q,$,Z){super(J,Q,$,Z)}interpolate_(J,Q,$,Z){let K=this.resultBuffer,W=this.sampleValues,H=this.valueSize,Y=($-Q)/(Z-Q),X=J*H;for(let U=X+H;X!==U;X+=4)tJ.slerpFlat(K,0,W,X-H,W,X,Y);return K}}class H6 extends eJ{constructor(J,Q,$,Z){super(J,Q,$,Z)}InterpolantFactoryMethodLinear(J){return new W$(this.times,this.values,this.getValueSize(),J)}}H6.prototype.ValueTypeName="quaternion";H6.prototype.InterpolantFactoryMethodSmooth=void 0;class X8 extends eJ{constructor(J,Q,$){super(J,Q,$)}}X8.prototype.ValueTypeName="string";X8.prototype.ValueBufferType=Array;X8.prototype.DefaultInterpolation=2300;X8.prototype.InterpolantFactoryMethodLinear=void 0;X8.prototype.InterpolantFactoryMethodSmooth=void 0;class H$ extends eJ{constructor(J,Q,$,Z){super(J,Q,$,Z)}}H$.prototype.ValueTypeName="vector";class Y${constructor(J,Q,$){let Z=this,K=!1,W=0,H=0,Y=void 0,X=[];this.onStart=void 0,this.onLoad=J,this.onProgress=Q,this.onError=$,this._abortController=null,this.itemStart=function(U){if(H++,K===!1){if(Z.onStart!==void 0)Z.onStart(U,W,H)}K=!0},this.itemEnd=function(U){if(W++,Z.onProgress!==void 0)Z.onProgress(U,W,H);if(W===H){if(K=!1,Z.onLoad!==void 0)Z.onLoad()}},this.itemError=function(U){if(Z.onError!==void 0)Z.onError(U)},this.resolveURL=function(U){if(U=U.normalize("NFC"),Y)return Y(U);return U},this.setURLModifier=function(U){return Y=U,this},this.addHandler=function(U,N){return X.push(U,N),this},this.removeHandler=function(U){let N=X.indexOf(U);if(N!==-1)X.splice(N,2);return this},this.getHandler=function(U){for(let N=0,q=X.length;N<q;N+=2){let G=X[N],D=X[N+1];if(G.global)G.lastIndex=0;if(G.test(U))return D}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){if(!this._abortController)this._abortController=new AbortController;return this._abortController}}var zK=new Y$;class X${constructor(J){if(this.manager=J!==void 0?J:zK,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(J,Q){let $=this;return new Promise(function(Z,K){$.load(J,Z,Q,K)})}parse(){}setCrossOrigin(J){return this.crossOrigin=J,this}setWithCredentials(J){return this.withCredentials=J,this}setPath(J){return this.path=J,this}setResourcePath(J){return this.resourcePath=J,this}setRequestHeader(J){return this.requestHeader=J,this}abort(){return this}}X$.DEFAULT_MATERIAL_NAME="__DEFAULT";var g7=new f,p7=new tJ,q9=new f;class Y6 extends _J{constructor(){super();this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new KJ,this.projectionMatrix=new KJ,this.projectionMatrixInverse=new KJ,this.coordinateSystem=2000,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(J,Q){return super.copy(J,Q),this.matrixWorldInverse.copy(J.matrixWorldInverse),this.projectionMatrix.copy(J.projectionMatrix),this.projectionMatrixInverse.copy(J.projectionMatrixInverse),this.coordinateSystem=J.coordinateSystem,this}getWorldDirection(J){return super.getWorldDirection(J).negate()}updateMatrixWorld(J){if(super.updateMatrixWorld(J),this.matrixWorld.decompose(g7,p7,q9),q9.x===1&&q9.y===1&&q9.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(g7,p7,q9.set(1,1,1)).invert()}updateWorldMatrix(J,Q,$=!1){if(super.updateWorldMatrix(J,Q,$),this.matrixWorld.decompose(g7,p7,q9),q9.x===1&&q9.y===1&&q9.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(g7,p7,q9.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}var b9=new f,DZ=new w0,OZ=new w0;class uJ extends Y6{constructor(J=50,Q=1,$=0.1,Z=2000){super();this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=J,this.zoom=1,this.near=$,this.far=Z,this.focus=10,this.aspect=Q,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(J,Q){return super.copy(J,Q),this.fov=J.fov,this.zoom=J.zoom,this.near=J.near,this.far=J.far,this.focus=J.focus,this.aspect=J.aspect,this.view=J.view===null?null:Object.assign({},J.view),this.filmGauge=J.filmGauge,this.filmOffset=J.filmOffset,this}setFocalLength(J){let Q=0.5*this.getFilmHeight()/J;this.fov=j8*2*Math.atan(Q),this.updateProjectionMatrix()}getFocalLength(){let J=Math.tan(e8*0.5*this.fov);return 0.5*this.getFilmHeight()/J}getEffectiveFOV(){return j8*2*Math.atan(Math.tan(e8*0.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(J,Q,$){b9.set(-1,-1,0.5).applyMatrix4(this.projectionMatrixInverse),Q.set(b9.x,b9.y).multiplyScalar(-J/b9.z),b9.set(1,1,0.5).applyMatrix4(this.projectionMatrixInverse),$.set(b9.x,b9.y).multiplyScalar(-J/b9.z)}getViewSize(J,Q){return this.getViewBounds(J,DZ,OZ),Q.subVectors(OZ,DZ)}setViewOffset(J,Q,$,Z,K,W){if(this.aspect=J/Q,this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=Q,this.view.offsetX=$,this.view.offsetY=Z,this.view.width=K,this.view.height=W,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=this.near,Q=J*Math.tan(e8*0.5*this.fov)/this.zoom,$=2*Q,Z=this.aspect*$,K=-0.5*Z,W=this.view;if(this.view!==null&&this.view.enabled){let{fullWidth:Y,fullHeight:X}=W;K+=W.offsetX*Z/Y,Q-=W.offsetY*$/X,Z*=W.width/Y,$*=W.height/X}let H=this.filmOffset;if(H!==0)K+=J*H/this.getFilmWidth();this.projectionMatrix.makePerspective(K,K+Z,Q,Q-$,J,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let Q=super.toJSON(J);if(Q.object.fov=this.fov,Q.object.zoom=this.zoom,Q.object.near=this.near,Q.object.far=this.far,Q.object.focus=this.focus,Q.object.aspect=this.aspect,this.view!==null)Q.object.view=Object.assign({},this.view);return Q.object.filmGauge=this.filmGauge,Q.object.filmOffset=this.filmOffset,Q}}class m8 extends Y6{constructor(J=-1,Q=1,$=1,Z=-1,K=0.1,W=2000){super();this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=J,this.right=Q,this.top=$,this.bottom=Z,this.near=K,this.far=W,this.updateProjectionMatrix()}copy(J,Q){return super.copy(J,Q),this.left=J.left,this.right=J.right,this.top=J.top,this.bottom=J.bottom,this.near=J.near,this.far=J.far,this.zoom=J.zoom,this.view=J.view===null?null:Object.assign({},J.view),this}setViewOffset(J,Q,$,Z,K,W){if(this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=Q,this.view.offsetX=$,this.view.offsetY=Z,this.view.width=K,this.view.height=W,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=(this.right-this.left)/(2*this.zoom),Q=(this.top-this.bottom)/(2*this.zoom),$=(this.right+this.left)/2,Z=(this.top+this.bottom)/2,K=$-J,W=$+J,H=Z+Q,Y=Z-Q;if(this.view!==null&&this.view.enabled){let X=(this.right-this.left)/this.view.fullWidth/this.zoom,U=(this.top-this.bottom)/this.view.fullHeight/this.zoom;K+=X*this.view.offsetX,W=K+X*this.view.width,H-=U*this.view.offsetY,Y=H-U*this.view.height}this.projectionMatrix.makeOrthographic(K,W,H,Y,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let Q=super.toJSON(J);if(Q.object.zoom=this.zoom,Q.object.left=this.left,Q.object.right=this.right,Q.object.top=this.top,Q.object.bottom=this.bottom,Q.object.near=this.near,Q.object.far=this.far,this.view!==null)Q.object.view=Object.assign({},this.view);return Q}}var C8=-90,P8=1;class U$ extends _J{constructor(J,Q,$){super();this.type="CubeCamera",this.renderTarget=$,this.coordinateSystem=null,this.activeMipmapLevel=0;let Z=new uJ(C8,P8,J,Q);Z.layers=this.layers,this.add(Z);let K=new uJ(C8,P8,J,Q);K.layers=this.layers,this.add(K);let W=new uJ(C8,P8,J,Q);W.layers=this.layers,this.add(W);let H=new uJ(C8,P8,J,Q);H.layers=this.layers,this.add(H);let Y=new uJ(C8,P8,J,Q);Y.layers=this.layers,this.add(Y);let X=new uJ(C8,P8,J,Q);X.layers=this.layers,this.add(X)}updateCoordinateSystem(){let J=this.coordinateSystem,Q=this.children.concat(),[$,Z,K,W,H,Y]=Q;for(let X of Q)this.remove(X);if(J===2000)$.up.set(0,1,0),$.lookAt(1,0,0),Z.up.set(0,1,0),Z.lookAt(-1,0,0),K.up.set(0,0,-1),K.lookAt(0,1,0),W.up.set(0,0,1),W.lookAt(0,-1,0),H.up.set(0,1,0),H.lookAt(0,0,1),Y.up.set(0,1,0),Y.lookAt(0,0,-1);else if(J===2001)$.up.set(0,-1,0),$.lookAt(-1,0,0),Z.up.set(0,-1,0),Z.lookAt(1,0,0),K.up.set(0,0,1),K.lookAt(0,1,0),W.up.set(0,0,-1),W.lookAt(0,-1,0),H.up.set(0,-1,0),H.lookAt(0,0,1),Y.up.set(0,-1,0),Y.lookAt(0,0,-1);else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+J);for(let X of Q)this.add(X),X.updateMatrixWorld()}update(J,Q){if(this.parent===null)this.updateMatrixWorld();let{renderTarget:$,activeMipmapLevel:Z}=this;if(this.coordinateSystem!==J.coordinateSystem)this.coordinateSystem=J.coordinateSystem,this.updateCoordinateSystem();let[K,W,H,Y,X,U]=this.children,N=J.getRenderTarget(),q=J.getActiveCubeFace(),G=J.getActiveMipmapLevel(),D=J.xr.enabled;J.xr.enabled=!1;let M=$.texture.generateMipmaps;$.texture.generateMipmaps=!1;let I=!1;if(J.isWebGLRenderer===!0)I=J.state.buffers.depth.getReversed();else I=J.reversedDepthBuffer;if(J.setRenderTarget($,0,Z),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,K),J.setRenderTarget($,1,Z),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,W),J.setRenderTarget($,2,Z),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,H),J.setRenderTarget($,3,Z),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,Y),J.setRenderTarget($,4,Z),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,X),$.texture.generateMipmaps=M,J.setRenderTarget($,5,Z),I&&J.autoClear===!1)J.clearDepth();J.render(Q,U),J.setRenderTarget(N,q,G),J.xr.enabled=D,$.texture.needsPMREMUpdate=!0}}class G$ extends uJ{constructor(J=[]){super();this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=J}}var N$="\\[\\]\\.:\\/",jH=new RegExp("["+N$+"]","g"),q$="[^"+N$+"]",yH="[^"+N$.replace("\\.","")+"]",fH=/((?:WC+[\/:])*)/.source.replace("WC",q$),vH=/(WCOD+)?/.source.replace("WCOD",yH),hH=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",q$),bH=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",q$),xH=new RegExp("^"+fH+vH+hH+bH+"$"),gH=["material","materials","bones","map"];class AK{constructor(J,Q,$){let Z=$||a0.parseTrackName(Q);this._targetGroup=J,this._bindings=J.subscribe_(Q,Z)}getValue(J,Q){this.bind();let $=this._targetGroup.nCachedObjects_,Z=this._bindings[$];if(Z!==void 0)Z.getValue(J,Q)}setValue(J,Q){let $=this._bindings;for(let Z=this._targetGroup.nCachedObjects_,K=$.length;Z!==K;++Z)$[Z].setValue(J,Q)}bind(){let J=this._bindings;for(let Q=this._targetGroup.nCachedObjects_,$=J.length;Q!==$;++Q)J[Q].bind()}unbind(){let J=this._bindings;for(let Q=this._targetGroup.nCachedObjects_,$=J.length;Q!==$;++Q)J[Q].unbind()}}class a0{constructor(J,Q,$){this.path=Q,this.parsedPath=$||a0.parseTrackName(Q),this.node=a0.findNode(J,this.parsedPath.nodeName),this.rootNode=J,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(J,Q,$){if(!(J&&J.isAnimationObjectGroup))return new a0(J,Q,$);else return new a0.Composite(J,Q,$)}static sanitizeNodeName(J){return J.replace(/\s/g,"_").replace(jH,"")}static parseTrackName(J){let Q=xH.exec(J);if(Q===null)throw Error("THREE.PropertyBinding: Cannot parse trackName: "+J);let $={nodeName:Q[2],objectName:Q[3],objectIndex:Q[4],propertyName:Q[5],propertyIndex:Q[6]},Z=$.nodeName&&$.nodeName.lastIndexOf(".");if(Z!==void 0&&Z!==-1){let K=$.nodeName.substring(Z+1);if(gH.indexOf(K)!==-1)$.nodeName=$.nodeName.substring(0,Z),$.objectName=K}if($.propertyName===null||$.propertyName.length===0)throw Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+J);return $}static findNode(J,Q){if(Q===void 0||Q===""||Q==="."||Q===-1||Q===J.name||Q===J.uuid)return J;if(J.skeleton){let $=J.skeleton.getBoneByName(Q);if($!==void 0)return $}if(J.children){let $=function(K){for(let W=0;W<K.length;W++){let H=K[W];if(H.name===Q||H.uuid===Q)return H;let Y=$(H.children);if(Y)return Y}return null},Z=$(J.children);if(Z)return Z}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(J,Q){J[Q]=this.targetObject[this.propertyName]}_getValue_array(J,Q){let $=this.resolvedProperty;for(let Z=0,K=$.length;Z!==K;++Z)J[Q++]=$[Z]}_getValue_arrayElement(J,Q){J[Q]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(J,Q){this.resolvedProperty.toArray(J,Q)}_setValue_direct(J,Q){this.targetObject[this.propertyName]=J[Q]}_setValue_direct_setNeedsUpdate(J,Q){this.targetObject[this.propertyName]=J[Q],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(J,Q){this.targetObject[this.propertyName]=J[Q],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(J,Q){let $=this.resolvedProperty;for(let Z=0,K=$.length;Z!==K;++Z)$[Z]=J[Q++]}_setValue_array_setNeedsUpdate(J,Q){let $=this.resolvedProperty;for(let Z=0,K=$.length;Z!==K;++Z)$[Z]=J[Q++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(J,Q){let $=this.resolvedProperty;for(let Z=0,K=$.length;Z!==K;++Z)$[Z]=J[Q++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q]}_setValue_arrayElement_setNeedsUpdate(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(J,Q){this.resolvedProperty.fromArray(J,Q)}_setValue_fromArray_setNeedsUpdate(J,Q){this.resolvedProperty.fromArray(J,Q),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(J,Q){this.resolvedProperty.fromArray(J,Q),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(J,Q){this.bind(),this.getValue(J,Q)}_setValue_unbound(J,Q){this.bind(),this.setValue(J,Q)}bind(){let J=this.node,Q=this.parsedPath,$=Q.objectName,Z=Q.propertyName,K=Q.propertyIndex;if(!J)J=a0.findNode(this.rootNode,Q.nodeName),this.node=J;if(this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!J){P0("PropertyBinding: No target node found for track: "+this.path+".");return}if($){let X=Q.objectIndex;switch($){case"materials":if(!J.material){S0("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.materials){S0("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}J=J.material.materials;break;case"bones":if(!J.skeleton){S0("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}J=J.skeleton.bones;for(let U=0;U<J.length;U++)if(J[U].name===X){X=U;break}break;case"map":if("map"in J){J=J.map;break}if(!J.material){S0("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.map){S0("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}J=J.material.map;break;default:if(J[$]===void 0){S0("PropertyBinding: Can not bind to objectName of node undefined.",this);return}J=J[$]}if(X!==void 0){if(J[X]===void 0){S0("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,J);return}J=J[X]}}let W=J[Z];if(W===void 0){let X=Q.nodeName;S0("PropertyBinding: Trying to update property for track: "+X+"."+Z+" but it wasn't found.",J);return}let H=this.Versioning.None;if(this.targetObject=J,J.isMaterial===!0)H=this.Versioning.NeedsUpdate;else if(J.isObject3D===!0)H=this.Versioning.MatrixWorldNeedsUpdate;let Y=this.BindingType.Direct;if(K!==void 0){if(Z==="morphTargetInfluences"){if(!J.geometry){S0("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!J.geometry.morphAttributes){S0("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}if(J.morphTargetDictionary[K]!==void 0)K=J.morphTargetDictionary[K]}Y=this.BindingType.ArrayElement,this.resolvedProperty=W,this.propertyIndex=K}else if(W.fromArray!==void 0&&W.toArray!==void 0)Y=this.BindingType.HasFromToArray,this.resolvedProperty=W;else if(Array.isArray(W))Y=this.BindingType.EntireArray,this.resolvedProperty=W;else this.propertyName=Z;this.getValue=this.GetterByBindingType[Y],this.setValue=this.SetterByBindingTypeAndVersioning[Y][H]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}a0.Composite=AK;a0.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};a0.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};a0.prototype.GetterByBindingType=[a0.prototype._getValue_direct,a0.prototype._getValue_array,a0.prototype._getValue_arrayElement,a0.prototype._getValue_toArray];a0.prototype.SetterByBindingTypeAndVersioning=[[a0.prototype._setValue_direct,a0.prototype._setValue_direct_setNeedsUpdate,a0.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[a0.prototype._setValue_array,a0.prototype._setValue_array_setNeedsUpdate,a0.prototype._setValue_array_setMatrixWorldNeedsUpdate],[a0.prototype._setValue_arrayElement,a0.prototype._setValue_arrayElement_setNeedsUpdate,a0.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[a0.prototype._setValue_fromArray,a0.prototype._setValue_fromArray_setNeedsUpdate,a0.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var iN=new Float32Array(1);var RZ=new KJ;class X6{constructor(J,Q,$=0,Z=1/0){this.ray=new p8(J,Q),this.near=$,this.far=Z,this.camera=null,this.layers=new X7,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(J,Q){this.ray.set(J,Q)}setFromCamera(J,Q){if(Q.isPerspectiveCamera)this.ray.origin.setFromMatrixPosition(Q.matrixWorld),this.ray.direction.set(J.x,J.y,0.5).unproject(Q).sub(this.ray.origin).normalize(),this.camera=Q;else if(Q.isOrthographicCamera)this.ray.origin.set(J.x,J.y,Q.projectionMatrix.elements[14]).unproject(Q),this.ray.direction.set(0,0,-1).transformDirection(Q.matrixWorld),this.camera=Q;else S0("Raycaster: Unsupported camera type: "+Q.type)}setFromXRController(J){return RZ.identity().extractRotation(J.matrixWorld),this.ray.origin.setFromMatrixPosition(J.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(RZ),this}intersectObject(J,Q=!0,$=[]){return m6(J,this,$,Q),$.sort(MZ),$}intersectObjects(J,Q=!0,$=[]){for(let Z=0,K=J.length;Z<K;Z++)m6(J[Z],this,$,Q);return $.sort(MZ),$}}function MZ(J,Q){return J.distance-Q.distance}function m6(J,Q,$,Z){let K=!0;if(J.layers.test(Q.layers)){if(J.raycast(Q,$)===!1)K=!1}if(K===!0&&Z===!0){let W=J.children;for(let H=0,Y=W.length;H<Y;H++)m6(W[H],Q,$,!0)}}class q7{constructor(J=1,Q=0,$=0){this.radius=J,this.phi=Q,this.theta=$}set(J,Q,$){return this.radius=J,this.phi=Q,this.theta=$,this}copy(J){return this.radius=J.radius,this.phi=J.phi,this.theta=J.theta,this}makeSafe(){return this.phi=b0(this.phi,0.000001,Math.PI-0.000001),this}setFromVector3(J){return this.setFromCartesianCoords(J.x,J.y,J.z)}setFromCartesianCoords(J,Q,$){if(this.radius=Math.sqrt(J*J+Q*Q+$*$),this.radius===0)this.theta=0,this.phi=0;else this.theta=Math.atan2(J,$),this.phi=Math.acos(b0(Q/this.radius,-1,1));return this}clone(){return new this.constructor().copy(this)}}class E${static{E$.prototype.isMatrix2=!0}constructor(J,Q,$,Z){if(this.elements=[1,0,0,1],J!==void 0)this.set(J,Q,$,Z)}identity(){return this.set(1,0,0,1),this}fromArray(J,Q=0){for(let $=0;$<4;$++)this.elements[$]=J[$+Q];return this}set(J,Q,$,Z){let K=this.elements;return K[0]=J,K[2]=Q,K[1]=$,K[3]=Z,this}}class U6 extends O9{constructor(J,Q=null){super();this.object=J,this.domElement=Q,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(J){if(this.domElement!==null)this.disconnect();this.domElement=J}disconnect(){}dispose(){}update(){}}function F$(J,Q,$,Z){let K=pH(Z);switch($){case 1021:return J*Q;case 1028:return J*Q/K.components*K.byteLength;case 1029:return J*Q/K.components*K.byteLength;case 1030:return J*Q*2/K.components*K.byteLength;case 1031:return J*Q*2/K.components*K.byteLength;case 1022:return J*Q*3/K.components*K.byteLength;case 1023:return J*Q*4/K.components*K.byteLength;case 1033:return J*Q*4/K.components*K.byteLength;case 33776:case 33777:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*8;case 33778:case 33779:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 35841:case 35843:return Math.max(J,16)*Math.max(Q,8)/4;case 35840:case 35842:return Math.max(J,8)*Math.max(Q,8)/2;case 36196:case 37492:case 37488:case 37489:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*8;case 37496:case 37490:case 37491:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 37808:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 37809:return Math.floor((J+4)/5)*Math.floor((Q+3)/4)*16;case 37810:return Math.floor((J+4)/5)*Math.floor((Q+4)/5)*16;case 37811:return Math.floor((J+5)/6)*Math.floor((Q+4)/5)*16;case 37812:return Math.floor((J+5)/6)*Math.floor((Q+5)/6)*16;case 37813:return Math.floor((J+7)/8)*Math.floor((Q+4)/5)*16;case 37814:return Math.floor((J+7)/8)*Math.floor((Q+5)/6)*16;case 37815:return Math.floor((J+7)/8)*Math.floor((Q+7)/8)*16;case 37816:return Math.floor((J+9)/10)*Math.floor((Q+4)/5)*16;case 37817:return Math.floor((J+9)/10)*Math.floor((Q+5)/6)*16;case 37818:return Math.floor((J+9)/10)*Math.floor((Q+7)/8)*16;case 37819:return Math.floor((J+9)/10)*Math.floor((Q+9)/10)*16;case 37820:return Math.floor((J+11)/12)*Math.floor((Q+9)/10)*16;case 37821:return Math.floor((J+11)/12)*Math.floor((Q+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(J/4)*Math.ceil(Q/4)*16;case 36283:case 36284:return Math.ceil(J/4)*Math.ceil(Q/4)*8;case 36285:case 36286:return Math.ceil(J/4)*Math.ceil(Q/4)*16}throw Error(`Unable to determine texture byte length for ${$} format.`)}function pH(J){switch(J){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:case 35899:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${J}.`)}if(typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));if(typeof window<"u")if(window.__THREE__)P0("WARNING: Multiple instances of Three.js being imported.");else window.__THREE__="186";function sK(){let J=null,Q=!1,$=null,Z=null;function K(W,H){Z=J.requestAnimationFrame(K),$(W,H)}return{start:function(){if(Q===!0)return;if($===null)return;if(J===null)return;Z=J.requestAnimationFrame(K),Q=!0},stop:function(){if(J!==null)J.cancelAnimationFrame(Z);Q=!1},setAnimationLoop:function(W){$=W},setContext:function(W){J=W}}}function mH(J){let Q=new WeakMap;function $(Y,X){let{array:U,usage:N}=Y,q=U.byteLength,G=J.createBuffer();J.bindBuffer(X,G),J.bufferData(X,U,N),Y.onUploadCallback();let D;if(U instanceof Float32Array)D=J.FLOAT;else if(typeof Float16Array<"u"&&U instanceof Float16Array)D=J.HALF_FLOAT;else if(U instanceof Uint16Array)if(Y.isFloat16BufferAttribute)D=J.HALF_FLOAT;else D=J.UNSIGNED_SHORT;else if(U instanceof Int16Array)D=J.SHORT;else if(U instanceof Uint32Array)D=J.UNSIGNED_INT;else if(U instanceof Int32Array)D=J.INT;else if(U instanceof Int8Array)D=J.BYTE;else if(U instanceof Uint8Array)D=J.UNSIGNED_BYTE;else if(U instanceof Uint8ClampedArray)D=J.UNSIGNED_BYTE;else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: "+U);return{buffer:G,type:D,bytesPerElement:U.BYTES_PER_ELEMENT,version:Y.version,size:q}}function Z(Y,X,U){let{array:N,updateRanges:q}=X;if(J.bindBuffer(U,Y),q.length===0)J.bufferSubData(U,0,N);else{q.sort((D,M)=>D.start-M.start);let G=0;for(let D=1;D<q.length;D++){let M=q[G],I=q[D];if(I.start<=M.start+M.count+1)M.count=Math.max(M.count,I.start+I.count-M.start);else++G,q[G]=I}q.length=G+1;for(let D=0,M=q.length;D<M;D++){let I=q[D];J.bufferSubData(U,I.start*N.BYTES_PER_ELEMENT,N,I.start,I.count)}X.clearUpdateRanges()}X.onUploadCallback()}function K(Y){if(Y.isInterleavedBufferAttribute)Y=Y.data;return Q.get(Y)}function W(Y){if(Y.isInterleavedBufferAttribute)Y=Y.data;let X=Q.get(Y);if(X)J.deleteBuffer(X.buffer),Q.delete(Y)}function H(Y,X){if(Y.isInterleavedBufferAttribute)Y=Y.data;if(Y.isGLBufferAttribute){let N=Q.get(Y);if(!N||N.version<Y.version)Q.set(Y,{buffer:Y.buffer,type:Y.type,bytesPerElement:Y.elementSize,version:Y.version});return}let U=Q.get(Y);if(U===void 0)Q.set(Y,$(Y,X));else if(U.version<Y.version){if(U.size!==Y.array.byteLength)throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");Z(U.buffer,Y,X),U.version=Y.version}}return{get:K,remove:W,update:H}}var lH=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,dH=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,uH=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,cH=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,nH=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,sH=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,iH=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,oH=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,aH=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,rH=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,tH=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,eH=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,JY=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,QY=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,$Y=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,ZY=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,KY=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,WY=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,HY=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,YY=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,XY=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,UY=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,GY=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,NY=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,qY=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,EY=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,FY=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,DY=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,OY=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,RY=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,MY="gl_FragColor = linearToOutputTexel( gl_FragColor );",LY=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,kY=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,VY=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,BY=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,IY=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,zY=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,AY=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,CY=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,PY=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,wY=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,_Y=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,TY=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,SY=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,jY=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,yY=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,fY=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,vY=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,hY=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,bY=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,xY=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,gY=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,pY=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,mY=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lY=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,dY=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,uY=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,cY=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,nY=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,sY=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,iY=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,oY=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,aY=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,rY=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,tY=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,eY=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,JX=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,QX=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,$X=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,ZX=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,KX=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,WX=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,HX=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,YX=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,XX=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,UX=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,GX=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,NX=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,qX=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,EX=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,FX=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,DX=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,OX=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,RX=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,MX=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,LX=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,kX=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,VX=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,BX=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,IX=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,zX=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,AX=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,CX=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,PX=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,wX=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,_X=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,TX=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,SX=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,jX=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,yX=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,fX=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,vX=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,hX=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,bX=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,xX=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,gX=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,pX=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,mX=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,lX=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,dX=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,uX=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cX=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,nX=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,sX=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,iX=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,oX=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,aX=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,rX=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,tX=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,eX=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,JU=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,QU=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,$U=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,ZU=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,KU=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,WU=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,HU=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,YU=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,XU=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,UU=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,GU=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,NU=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,qU=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,EU=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,FU=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,DU=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,OU=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,RU=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,MU=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,LU=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,kU=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,VU=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,v0={alphahash_fragment:lH,alphahash_pars_fragment:dH,alphamap_fragment:uH,alphamap_pars_fragment:cH,alphatest_fragment:nH,alphatest_pars_fragment:sH,aomap_fragment:iH,aomap_pars_fragment:oH,batching_pars_vertex:aH,batching_vertex:rH,begin_vertex:tH,beginnormal_vertex:eH,bsdfs:JY,iridescence_fragment:QY,bumpmap_pars_fragment:$Y,clipping_planes_fragment:ZY,clipping_planes_pars_fragment:KY,clipping_planes_pars_vertex:WY,clipping_planes_vertex:HY,color_fragment:YY,color_pars_fragment:XY,color_pars_vertex:UY,color_vertex:GY,common:NY,cube_uv_reflection_fragment:qY,defaultnormal_vertex:EY,displacementmap_pars_vertex:FY,displacementmap_vertex:DY,emissivemap_fragment:OY,emissivemap_pars_fragment:RY,colorspace_fragment:MY,colorspace_pars_fragment:LY,envmap_fragment:kY,envmap_common_pars_fragment:VY,envmap_pars_fragment:BY,envmap_pars_vertex:IY,envmap_physical_pars_fragment:fY,envmap_vertex:zY,fog_vertex:AY,fog_pars_vertex:CY,fog_fragment:PY,fog_pars_fragment:wY,gradientmap_pars_fragment:_Y,lightmap_pars_fragment:TY,lights_lambert_fragment:SY,lights_lambert_pars_fragment:jY,lights_pars_begin:yY,lights_toon_fragment:vY,lights_toon_pars_fragment:hY,lights_phong_fragment:bY,lights_phong_pars_fragment:xY,lights_physical_fragment:gY,lights_physical_pars_fragment:pY,lights_fragment_begin:mY,lights_fragment_maps:lY,lights_fragment_end:dY,lightprobes_pars_fragment:uY,logdepthbuf_fragment:cY,logdepthbuf_pars_fragment:nY,logdepthbuf_pars_vertex:sY,logdepthbuf_vertex:iY,map_fragment:oY,map_pars_fragment:aY,map_particle_fragment:rY,map_particle_pars_fragment:tY,metalnessmap_fragment:eY,metalnessmap_pars_fragment:JX,morphinstance_vertex:QX,morphcolor_vertex:$X,morphnormal_vertex:ZX,morphtarget_pars_vertex:KX,morphtarget_vertex:WX,normal_fragment_begin:HX,normal_fragment_maps:YX,normal_pars_fragment:XX,normal_pars_vertex:UX,normal_vertex:GX,normalmap_pars_fragment:NX,clearcoat_normal_fragment_begin:qX,clearcoat_normal_fragment_maps:EX,clearcoat_pars_fragment:FX,iridescence_pars_fragment:DX,opaque_fragment:OX,packing:RX,premultiplied_alpha_fragment:MX,project_vertex:LX,dithering_fragment:kX,dithering_pars_fragment:VX,roughnessmap_fragment:BX,roughnessmap_pars_fragment:IX,shadowmap_pars_fragment:zX,shadowmap_pars_vertex:AX,shadowmap_vertex:CX,shadowmask_pars_fragment:PX,skinbase_vertex:wX,skinning_pars_vertex:_X,skinning_vertex:TX,skinnormal_vertex:SX,specularmap_fragment:jX,specularmap_pars_fragment:yX,tonemapping_fragment:fX,tonemapping_pars_fragment:vX,transmission_fragment:hX,transmission_pars_fragment:bX,uv_pars_fragment:xX,uv_pars_vertex:gX,uv_vertex:pX,worldpos_vertex:mX,background_vert:lX,background_frag:dX,backgroundCube_vert:uX,backgroundCube_frag:cX,cube_vert:nX,cube_frag:sX,depth_vert:iX,depth_frag:oX,distance_vert:aX,distance_frag:rX,equirect_vert:tX,equirect_frag:eX,linedashed_vert:JU,linedashed_frag:QU,meshbasic_vert:$U,meshbasic_frag:ZU,meshlambert_vert:KU,meshlambert_frag:WU,meshmatcap_vert:HU,meshmatcap_frag:YU,meshnormal_vert:XU,meshnormal_frag:UU,meshphong_vert:GU,meshphong_frag:NU,meshphysical_vert:qU,meshphysical_frag:EU,meshtoon_vert:FU,meshtoon_frag:DU,points_vert:OU,points_frag:RU,shadow_vert:MU,shadow_frag:LU,sprite_vert:kU,sprite_frag:VU},G0={common:{diffuse:{value:new g0(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new j0},alphaMap:{value:null},alphaMapTransform:{value:new j0},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new j0}},envmap:{envMap:{value:null},envMapRotation:{value:new j0},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:0.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new j0}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new j0}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new j0},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new j0},normalScale:{value:new w0(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new j0},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new j0}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new j0}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new j0}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:0.00025},fogNear:{value:1},fogFar:{value:2000},fogColor:{value:new g0(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new f},probesMax:{value:new f},probesResolution:{value:new f}},points:{diffuse:{value:new g0(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new j0},alphaTest:{value:0},uvTransform:{value:new j0}},sprite:{diffuse:{value:new g0(16777215)},opacity:{value:1},center:{value:new w0(0.5,0.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new j0},alphaMap:{value:null},alphaMapTransform:{value:new j0},alphaTest:{value:0}}},M9={basic:{uniforms:TJ([G0.common,G0.specularmap,G0.envmap,G0.aomap,G0.lightmap,G0.fog]),vertexShader:v0.meshbasic_vert,fragmentShader:v0.meshbasic_frag},lambert:{uniforms:TJ([G0.common,G0.specularmap,G0.envmap,G0.aomap,G0.lightmap,G0.emissivemap,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.fog,G0.lights,{emissive:{value:new g0(0)},envMapIntensity:{value:1}}]),vertexShader:v0.meshlambert_vert,fragmentShader:v0.meshlambert_frag},phong:{uniforms:TJ([G0.common,G0.specularmap,G0.envmap,G0.aomap,G0.lightmap,G0.emissivemap,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.fog,G0.lights,{emissive:{value:new g0(0)},specular:{value:new g0(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:v0.meshphong_vert,fragmentShader:v0.meshphong_frag},standard:{uniforms:TJ([G0.common,G0.envmap,G0.aomap,G0.lightmap,G0.emissivemap,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.roughnessmap,G0.metalnessmap,G0.fog,G0.lights,{emissive:{value:new g0(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:v0.meshphysical_vert,fragmentShader:v0.meshphysical_frag},toon:{uniforms:TJ([G0.common,G0.aomap,G0.lightmap,G0.emissivemap,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.gradientmap,G0.fog,G0.lights,{emissive:{value:new g0(0)}}]),vertexShader:v0.meshtoon_vert,fragmentShader:v0.meshtoon_frag},matcap:{uniforms:TJ([G0.common,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.fog,{matcap:{value:null}}]),vertexShader:v0.meshmatcap_vert,fragmentShader:v0.meshmatcap_frag},points:{uniforms:TJ([G0.points,G0.fog]),vertexShader:v0.points_vert,fragmentShader:v0.points_frag},dashed:{uniforms:TJ([G0.common,G0.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:v0.linedashed_vert,fragmentShader:v0.linedashed_frag},depth:{uniforms:TJ([G0.common,G0.displacementmap]),vertexShader:v0.depth_vert,fragmentShader:v0.depth_frag},normal:{uniforms:TJ([G0.common,G0.bumpmap,G0.normalmap,G0.displacementmap,{opacity:{value:1}}]),vertexShader:v0.meshnormal_vert,fragmentShader:v0.meshnormal_frag},sprite:{uniforms:TJ([G0.sprite,G0.fog]),vertexShader:v0.sprite_vert,fragmentShader:v0.sprite_frag},background:{uniforms:{uvTransform:{value:new j0},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:v0.background_vert,fragmentShader:v0.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new j0}},vertexShader:v0.backgroundCube_vert,fragmentShader:v0.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:v0.cube_vert,fragmentShader:v0.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:v0.equirect_vert,fragmentShader:v0.equirect_frag},distance:{uniforms:TJ([G0.common,G0.displacementmap,{referencePosition:{value:new f},nearDistance:{value:1},farDistance:{value:1000}}]),vertexShader:v0.distance_vert,fragmentShader:v0.distance_frag},shadow:{uniforms:TJ([G0.lights,G0.fog,{color:{value:new g0(0)},opacity:{value:1}}]),vertexShader:v0.shadow_vert,fragmentShader:v0.shadow_frag}};M9.physical={uniforms:TJ([M9.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new j0},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new j0},clearcoatNormalScale:{value:new w0(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new j0},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new j0},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new j0},sheen:{value:0},sheenColor:{value:new g0(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new j0},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new j0},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new j0},transmissionSamplerSize:{value:new w0},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new j0},attenuationDistance:{value:0},attenuationColor:{value:new g0(0)},specularColor:{value:new g0(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new j0},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new j0},anisotropyVector:{value:new w0},anisotropyMap:{value:null},anisotropyMapTransform:{value:new j0}}]),vertexShader:v0.meshphysical_vert,fragmentShader:v0.meshphysical_frag};var G6={r:0,b:0,g:0},BU=new KJ,iK=new j0;iK.set(-1,0,0,0,1,0,0,0,1);function IU(J,Q,$,Z,K,W){let H=new g0(0),Y=K===!0?0:1,X,U,N=null,q=0,G=null;function D(A){let _=A.isScene===!0?A.background:null;if(_&&_.isTexture){let V=A.backgroundBlurriness>0;_=Q.get(_,V)}return _}function M(A){let _=!1,V=D(A);if(V===null)F(H,Y);else if(V&&V.isColor)F(V,1),_=!0;let z=J.xr.getEnvironmentBlendMode();if(z==="additive")$.buffers.color.setClear(0,0,0,1,W);else if(z==="alpha-blend")$.buffers.color.setClear(0,0,0,0,W);if(J.autoClear||_)$.buffers.depth.setTest(!0),$.buffers.depth.setMask(!0),$.buffers.color.setMask(!0),J.clear(J.autoClearColor,J.autoClearDepth,J.autoClearStencil)}function I(A,_){let V=D(_);if(V&&(V.isCubeTexture||V.mapping===K7)){if(U===void 0)U=new zJ(new l9(1,1,1),new SJ({name:"BackgroundCubeMaterial",uniforms:W8(M9.backgroundCube.uniforms),vertexShader:M9.backgroundCube.vertexShader,fragmentShader:M9.backgroundCube.fragmentShader,side:bJ,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),U.geometry.deleteAttribute("normal"),U.geometry.deleteAttribute("uv"),U.onBeforeRender=function(z,C,P){this.matrixWorld.copyPosition(P.matrixWorld)},Object.defineProperty(U.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),Z.update(U);if(U.material.uniforms.envMap.value=V,U.material.uniforms.backgroundBlurriness.value=_.backgroundBlurriness,U.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,U.material.uniforms.backgroundRotation.value.setFromMatrix4(BU.makeRotationFromEuler(_.backgroundRotation)).transpose(),V.isCubeTexture&&V.isRenderTargetTexture===!1)U.material.uniforms.backgroundRotation.value.premultiply(iK);if(U.material.toneMapped=m0.getTransfer(V.colorSpace)!==JJ,N!==V||q!==V.version||G!==J.toneMapping)U.material.needsUpdate=!0,N=V,q=V.version,G=J.toneMapping;U.layers.enableAll(),A.unshift(U,U.geometry,U.material,0,0,null)}else if(V&&V.isTexture){if(X===void 0)X=new zJ(new K8(2,2),new SJ({name:"BackgroundMaterial",uniforms:W8(M9.background.uniforms),vertexShader:M9.background.vertexShader,fragmentShader:M9.background.fragmentShader,side:f8,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),X.geometry.deleteAttribute("normal"),Object.defineProperty(X.material,"map",{get:function(){return this.uniforms.t2D.value}}),Z.update(X);if(X.material.uniforms.t2D.value=V,X.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,X.material.toneMapped=m0.getTransfer(V.colorSpace)!==JJ,V.matrixAutoUpdate===!0)V.updateMatrix();if(X.material.uniforms.uvTransform.value.copy(V.matrix),N!==V||q!==V.version||G!==J.toneMapping)X.material.needsUpdate=!0,N=V,q=V.version,G=J.toneMapping;X.layers.enableAll(),A.unshift(X,X.geometry,X.material,0,0,null)}}function F(A,_){A.getRGB(G6,oQ(J)),$.buffers.color.setClear(G6.r,G6.g,G6.b,_,W)}function E(){if(U!==void 0)U.geometry.dispose(),U.material.dispose(),U=void 0;if(X!==void 0)X.geometry.dispose(),X.material.dispose(),X=void 0}return{getClearColor:function(){return H},setClearColor:function(A,_=1){H.set(A),Y=_,F(H,Y)},getClearAlpha:function(){return Y},setClearAlpha:function(A){Y=A,F(H,Y)},render:M,addToRenderList:I,dispose:E}}function zU(J,Q){let $=J.getParameter(J.MAX_VERTEX_ATTRIBS),Z={},K=G(null),W=K,H=!1;function Y(v,h,r,j,d){let o=!1,m=q(v,j,r,h);if(W!==m)W=m,U(W.object);if(o=D(v,j,r,d),o)M(v,j,r,d);if(d!==null)Q.update(d,J.ELEMENT_ARRAY_BUFFER);if(o||H){if(H=!1,V(v,h,r,j),d!==null)J.bindBuffer(J.ELEMENT_ARRAY_BUFFER,Q.get(d).buffer)}}function X(){return J.createVertexArray()}function U(v){return J.bindVertexArray(v)}function N(v){return J.deleteVertexArray(v)}function q(v,h,r,j){let d=j.wireframe===!0,o=Z[h.id];if(o===void 0)o={},Z[h.id]=o;let m=v.isInstancedMesh===!0?v.id:0,Q0=o[m];if(Q0===void 0)Q0={},o[m]=Q0;let c=Q0[r.id];if(c===void 0)c={},Q0[r.id]=c;let a=c[d];if(a===void 0)a=G(X()),c[d]=a;return a}function G(v){let h=[],r=[],j=[];for(let d=0;d<$;d++)h[d]=0,r[d]=0,j[d]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:h,enabledAttributes:r,attributeDivisors:j,object:v,attributes:{},index:null}}function D(v,h,r,j){let d=W.attributes,o=h.attributes,m=0,Q0=r.getAttributes();for(let c in Q0)if(Q0[c].location>=0){let J0=d[c],_0=o[c];if(_0===void 0){if(c==="instanceMatrix"&&v.instanceMatrix)_0=v.instanceMatrix;if(c==="instanceColor"&&v.instanceColor)_0=v.instanceColor}if(J0===void 0)return!0;if(J0.attribute!==_0)return!0;if(_0&&J0.data!==_0.data)return!0;m++}if(W.attributesNum!==m)return!0;if(W.index!==j)return!0;return!1}function M(v,h,r,j){let d={},o=h.attributes,m=0,Q0=r.getAttributes();for(let c in Q0)if(Q0[c].location>=0){let J0=o[c];if(J0===void 0){if(c==="instanceMatrix"&&v.instanceMatrix)J0=v.instanceMatrix;if(c==="instanceColor"&&v.instanceColor)J0=v.instanceColor}let _0={};if(_0.attribute=J0,J0&&J0.data)_0.data=J0.data;d[c]=_0,m++}W.attributes=d,W.attributesNum=m,W.index=j}function I(){let v=W.newAttributes;for(let h=0,r=v.length;h<r;h++)v[h]=0}function F(v){E(v,0)}function E(v,h){let{newAttributes:r,enabledAttributes:j,attributeDivisors:d}=W;if(r[v]=1,j[v]===0)J.enableVertexAttribArray(v),j[v]=1;if(d[v]!==h)J.vertexAttribDivisor(v,h),d[v]=h}function A(){let{newAttributes:v,enabledAttributes:h}=W;for(let r=0,j=h.length;r<j;r++)if(h[r]!==v[r])J.disableVertexAttribArray(r),h[r]=0}function _(v,h,r,j,d,o,m){if(m===!0)J.vertexAttribIPointer(v,h,r,d,o);else J.vertexAttribPointer(v,h,r,j,d,o)}function V(v,h,r,j){I();let d=j.attributes,o=r.getAttributes(),m=h.defaultAttributeValues;for(let Q0 in o){let c=o[Q0];if(c.location>=0){let a=d[Q0];if(a===void 0){if(Q0==="instanceMatrix"&&v.instanceMatrix)a=v.instanceMatrix;if(Q0==="instanceColor"&&v.instanceColor)a=v.instanceColor}if(a!==void 0){let{normalized:J0,itemSize:_0}=a,z0=Q.get(a);if(z0===void 0)continue;let{buffer:QJ,type:h0,bytesPerElement:n}=z0,$0=h0===J.INT||h0===J.UNSIGNED_INT||a.gpuType===JQ;if(a.isInterleavedBufferAttribute){let K0=a.data,A0=K0.stride,T0=a.offset;if(K0.isInstancedInterleavedBuffer){for(let B0=0;B0<c.locationSize;B0++)E(c.location+B0,K0.meshPerAttribute);if(v.isInstancedMesh!==!0&&j._maxInstanceCount===void 0)j._maxInstanceCount=K0.meshPerAttribute*K0.count}else for(let B0=0;B0<c.locationSize;B0++)F(c.location+B0);J.bindBuffer(J.ARRAY_BUFFER,QJ);for(let B0=0;B0<c.locationSize;B0++)_(c.location+B0,_0/c.locationSize,h0,J0,A0*n,(T0+_0/c.locationSize*B0)*n,$0)}else{if(a.isInstancedBufferAttribute){for(let K0=0;K0<c.locationSize;K0++)E(c.location+K0,a.meshPerAttribute);if(v.isInstancedMesh!==!0&&j._maxInstanceCount===void 0)j._maxInstanceCount=a.meshPerAttribute*a.count}else for(let K0=0;K0<c.locationSize;K0++)F(c.location+K0);J.bindBuffer(J.ARRAY_BUFFER,QJ);for(let K0=0;K0<c.locationSize;K0++)_(c.location+K0,_0/c.locationSize,h0,J0,_0*n,_0/c.locationSize*K0*n,$0)}}else if(m!==void 0){let J0=m[Q0];if(J0!==void 0)switch(J0.length){case 2:J.vertexAttrib2fv(c.location,J0);break;case 3:J.vertexAttrib3fv(c.location,J0);break;case 4:J.vertexAttrib4fv(c.location,J0);break;default:J.vertexAttrib1fv(c.location,J0)}}}}A()}function z(){B();for(let v in Z){let h=Z[v];for(let r in h){let j=h[r];for(let d in j){let o=j[d];for(let m in o)N(o[m].object),delete o[m];delete j[d]}}delete Z[v]}}function C(v){if(Z[v.id]===void 0)return;let h=Z[v.id];for(let r in h){let j=h[r];for(let d in j){let o=j[d];for(let m in o)N(o[m].object),delete o[m];delete j[d]}}delete Z[v.id]}function P(v){for(let h in Z){let r=Z[h];for(let j in r){let d=r[j];if(d[v.id]===void 0)continue;let o=d[v.id];for(let m in o)N(o[m].object),delete o[m];delete d[v.id]}}}function L(v){for(let h in Z){let r=Z[h],j=v.isInstancedMesh===!0?v.id:0,d=r[j];if(d===void 0)continue;for(let o in d){let m=d[o];for(let Q0 in m)N(m[Q0].object),delete m[Q0];delete d[o]}if(delete r[j],Object.keys(r).length===0)delete Z[h]}}function B(){if(l(),H=!0,W===K)return;W=K,U(W.object)}function l(){K.geometry=null,K.program=null,K.wireframe=!1}return{setup:Y,reset:B,resetDefaultState:l,dispose:z,releaseStatesOfGeometry:C,releaseStatesOfObject:L,releaseStatesOfProgram:P,initAttributes:I,enableAttribute:F,disableUnusedAttributes:A}}function AU(J,Q,$){let Z;function K(X){Z=X}function W(X,U){J.drawArrays(Z,X,U),$.update(U,Z,1)}function H(X,U,N){if(N===0)return;J.drawArraysInstanced(Z,X,U,N),$.update(U,Z,N)}function Y(X,U,N){if(N===0)return;Q.get("WEBGL_multi_draw").multiDrawArraysWEBGL(Z,X,0,U,0,N);let G=0;for(let D=0;D<N;D++)G+=U[D];$.update(G,Z,1)}this.setMode=K,this.render=W,this.renderInstances=H,this.renderMultiDraw=Y}function CU(J,Q,$,Z){let K;function W(){if(K!==void 0)return K;if(Q.has("EXT_texture_filter_anisotropic")===!0){let P=Q.get("EXT_texture_filter_anisotropic");K=J.getParameter(P.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else K=0;return K}function H(P){if(P!==D9&&Z.convert(P)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_FORMAT))return!1;return!0}function Y(P){let L=P===F9&&(Q.has("EXT_color_buffer_half_float")||Q.has("EXT_color_buffer_float"));if(P!==Y9&&P!==P9&&!L&&Z.convert(P)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_TYPE))return!1;return!0}function X(P){if(P==="highp"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.HIGH_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.HIGH_FLOAT).precision>0)return"highp";P="mediump"}if(P==="mediump"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.MEDIUM_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.MEDIUM_FLOAT).precision>0)return"mediump"}return"lowp"}let U=$.precision!==void 0?$.precision:"highp",N=X(U);if(N!==U)P0("WebGLRenderer:",U,"not supported, using",N,"instead."),U=N;let q=$.logarithmicDepthBuffer===!0,G=$.reversedDepthBuffer===!0&&Q.has("EXT_clip_control");if($.reversedDepthBuffer===!0&&G===!1)P0("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let D=J.getParameter(J.MAX_TEXTURE_IMAGE_UNITS),M=J.getParameter(J.MAX_VERTEX_TEXTURE_IMAGE_UNITS),I=J.getParameter(J.MAX_TEXTURE_SIZE),F=J.getParameter(J.MAX_CUBE_MAP_TEXTURE_SIZE),E=J.getParameter(J.MAX_VERTEX_ATTRIBS),A=J.getParameter(J.MAX_VERTEX_UNIFORM_VECTORS),_=J.getParameter(J.MAX_VARYING_VECTORS),V=J.getParameter(J.MAX_FRAGMENT_UNIFORM_VECTORS),z=J.getParameter(J.MAX_SAMPLES),C=J.getParameter(J.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:W,getMaxPrecision:X,textureFormatReadable:H,textureTypeReadable:Y,precision:U,logarithmicDepthBuffer:q,reversedDepthBuffer:G,maxTextures:D,maxVertexTextures:M,maxTextureSize:I,maxCubemapSize:F,maxAttributes:E,maxVertexUniforms:A,maxVaryings:_,maxFragmentUniforms:V,maxSamples:z,samples:C}}function PU(J){let Q=this,$=null,Z=0,K=!1,W=!1,H=new oJ,Y=new j0,X={value:null,needsUpdate:!1};this.uniform=X,this.numPlanes=0,this.numIntersection=0,this.init=function(q,G){let D=q.length!==0||G||Z!==0||K;return K=G,Z=q.length,D},this.beginShadows=function(){W=!0,N(null)},this.endShadows=function(){W=!1},this.setGlobalState=function(q,G){$=N(q,G,0)},this.setState=function(q,G,D){let{clippingPlanes:M,clipIntersection:I,clipShadows:F}=q,E=J.get(q);if(!K||M===null||M.length===0||W&&!F)if(W)N(null);else U();else{let A=W?0:Z,_=A*4,V=E.clippingState||null;X.value=V,V=N(M,G,_,D);for(let z=0;z!==_;++z)V[z]=$[z];E.clippingState=V,this.numIntersection=I?this.numPlanes:0,this.numPlanes+=A}};function U(){if(X.value!==$)X.value=$,X.needsUpdate=Z>0;Q.numPlanes=Z,Q.numIntersection=0}function N(q,G,D,M){let I=q!==null?q.length:0,F=null;if(I!==0){if(F=X.value,M!==!0||F===null){let E=D+I*4,A=G.matrixWorldInverse;if(Y.getNormalMatrix(A),F===null||F.length<E)F=new Float32Array(E);for(let _=0,V=D;_!==I;++_,V+=4)H.copy(q[_]).applyMatrix4(A,Y),H.normal.toArray(F,V),F[V+3]=H.constant}X.value=F,X.needsUpdate=!0}return Q.numPlanes=I,Q.numIntersection=0,F}}var d8=4,wU=6,_U=20,TU=256,E7=new m8,CK=new g0,D$=null,O$=0,R$=0,M$=!1,SU=new f,U8=new f;class V${constructor(J){this._renderer=J,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(J,Q=0,$=0.1,Z=100,K={}){let{size:W=256,position:H=SU}=K;D$=this._renderer.getRenderTarget(),O$=this._renderer.getActiveCubeFace(),R$=this._renderer.getActiveMipmapLevel(),M$=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(W);let Y=this._allocateTargets();if(Y.depthBuffer=!0,this._sceneToCubeUV(J,$,Z,Y,H),Q>0)this._blur(Y,0,0,Q);return this._applyPMREM(Y),this._cleanup(Y),Y}fromEquirectangular(J,Q=null){return this._fromTexture(J,Q)}fromCubemap(J,Q=null){return this._fromTexture(J,Q)}compileCubemapShader(){if(this._cubemapMaterial===null)this._cubemapMaterial=_K(),this._compileMaterial(this._cubemapMaterial)}compileEquirectangularShader(){if(this._equirectMaterial===null)this._equirectMaterial=wK(),this._compileMaterial(this._equirectMaterial)}dispose(){if(this._dispose(),this._cubemapMaterial!==null)this._cubemapMaterial.dispose();if(this._equirectMaterial!==null)this._equirectMaterial.dispose();if(this._backgroundBox!==null)this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose()}_setSize(J){this._lodMax=Math.floor(Math.log2(J)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){if(this._blurMaterial!==null)this._blurMaterial.dispose();if(this._ggxMaterial!==null)this._ggxMaterial.dispose();if(this._pingPongRenderTarget!==null)this._pingPongRenderTarget.dispose();for(let J=0;J<this._lodMeshes.length;J++)this._lodMeshes[J].geometry.dispose()}_cleanup(J){this._renderer.setRenderTarget(D$,O$,R$),this._renderer.xr.enabled=M$,J.scissorTest=!1,l8(J,0,0,J.width,J.height)}_fromTexture(J,Q){if(J.mapping===h8||J.mapping===a9)this._setSize(J.image.length===0?16:J.image[0].width||J.image[0].image.width);else this._setSize(J.image.width/4);D$=this._renderer.getRenderTarget(),O$=this._renderer.getActiveCubeFace(),R$=this._renderer.getActiveMipmapLevel(),M$=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let $=Q||this._allocateTargets();return this._textureToCubeUV(J,$),this._applyPMREM($),this._cleanup($),$}_allocateTargets(){let J=3*Math.max(this._cubeSize,112),Q=4*this._cubeSize,$={magFilter:xJ,minFilter:xJ,generateMipmaps:!1,type:F9,format:D9,colorSpace:bQ,depthBuffer:!1},Z=PK(J,Q,$);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==J||this._pingPongRenderTarget.height!==Q){if(this._pingPongRenderTarget!==null)this._dispose();this._pingPongRenderTarget=PK(J,Q,$);let{_lodMax:K}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=jU(K)),this._blurMaterial=fU(K,J,Q),this._ggxMaterial=yU(K,J,Q)}return Z}_compileMaterial(J){let Q=new zJ(new gJ,J);this._renderer.compile(Q,E7)}_sceneToCubeUV(J,Q,$,Z,K){let Y=new uJ(90,1,Q,$),X=[1,-1,1,1,1,1],U=[1,1,1,-1,-1,-1],N=this._renderer,q=N.autoClear,G=N.toneMapping;if(N.getClearColor(CK),N.toneMapping=H9,N.autoClear=!1,N.state.buffers.depth.getReversed())N.setRenderTarget(Z),N.clearDepth(),N.setRenderTarget(null);if(this._backgroundBox===null)this._backgroundBox=new zJ(new l9,new $8({name:"PMREM.Background",side:bJ,depthWrite:!1,depthTest:!1}));let M=this._backgroundBox,I=M.material,F=!1,E=J.background;if(E){if(E.isColor)I.color.copy(E),J.background=null,F=!0}else I.color.copy(CK),F=!0;for(let A=0;A<6;A++){let _=A%3;if(_===0)Y.up.set(0,X[A],0),Y.position.set(K.x,K.y,K.z),Y.lookAt(K.x+U[A],K.y,K.z);else if(_===1)Y.up.set(0,0,X[A]),Y.position.set(K.x,K.y,K.z),Y.lookAt(K.x,K.y+U[A],K.z);else Y.up.set(0,X[A],0),Y.position.set(K.x,K.y,K.z),Y.lookAt(K.x,K.y,K.z+U[A]);let V=this._cubeSize;if(l8(Z,_*V,A>2?V:0,V,V),N.setRenderTarget(Z),F)N.render(M,Y);N.render(J,Y)}N.toneMapping=G,N.autoClear=q,J.background=E}_textureToCubeUV(J,Q){let $=this._renderer,Z=J.mapping===h8||J.mapping===a9;if(Z){if(this._cubemapMaterial===null)this._cubemapMaterial=_K();this._cubemapMaterial.uniforms.flipEnvMap.value=J.isRenderTargetTexture===!1?-1:1}else if(this._equirectMaterial===null)this._equirectMaterial=wK();let K=Z?this._cubemapMaterial:this._equirectMaterial,W=this._lodMeshes[0];W.material=K;let H=K.uniforms;H.envMap.value=J;let Y=this._cubeSize;l8(Q,0,0,3*Y,2*Y),$.setRenderTarget(Q),$.render(W,E7)}_applyPMREM(J){let Q=this._renderer,$=Q.autoClear;Q.autoClear=!1;let Z=this._lodMeshes.length;for(let K=1;K<Z;K++)this._applyGGXFilter(J,K-1,K);Q.autoClear=$}_applyGGXFilter(J,Q,$){let Z=this._renderer,K=this._pingPongRenderTarget,W=this._ggxMaterial,H=this._lodMeshes[$];H.material=W;let Y=W.uniforms,X=$/(this._lodMeshes.length-1),U=Q/(this._lodMeshes.length-1),N=Math.sqrt(X*X-U*U),q=X*1.25,G=N*q,{_lodMax:D}=this,M=this._sizeLods[$],I=3*M*($>D-d8?$-D+d8:0),F=4*(this._cubeSize-M);Y.envMap.value=J.texture,Y.roughness.value=G,Y.mipInt.value=D-Q,l8(K,I,F,3*M,2*M),Z.setRenderTarget(K),Z.render(H,E7),Y.envMap.value=K.texture,Y.roughness.value=0,Y.mipInt.value=D-$,l8(J,I,F,3*M,2*M),Z.setRenderTarget(J),Z.render(H,E7)}_blur(J,Q,$,Z){let K=this._pingPongRenderTarget,W=Math.min(Z,Math.PI)/Math.SQRT2;this._blurPass(J,K,Q,$,W),this._blurPass(K,J,$,$,W)}_blurPass(J,Q,$,Z,K){let W=this._renderer,H=this._blurMaterial,Y=this._lodMeshes[Z];Y.material=H;let X=H.uniforms;X.envMap.value=J.texture,X.sigma.value=K,X.mipInt.value=this._lodMax-$;let U=this._sizeLods[Z],N=3*U*(Z>this._lodMax-d8?Z-this._lodMax+d8:0),q=4*(this._cubeSize-U);l8(Q,N,q,3*U,2*U),W.setRenderTarget(Q),W.render(Y,E7)}}function jU(J){let Q=[],$=[],Z=J,K=J-d8+1+wU;for(let W=0;W<K;W++){let H=Math.pow(2,Z);Q.push(H);let Y=1/(H-2),X=-Y,U=1+Y,N=[X,X,U,X,U,U,X,X,U,U,X,U],q=6,G=6,D=3,M=new Float32Array(D*G*q),I=new Float32Array(D*G*q);for(let E=0;E<q;E++){let A=E%3*2/3-1,_=E>2?0:-1,V=[A,_,0,A+0.6666666666666666,_,0,A+0.6666666666666666,_+1,0,A,_,0,A+0.6666666666666666,_+1,0,A,_+1,0];M.set(V,D*G*E);for(let z=0;z<G;z++){let C=N[z*2]*2-1,P=N[z*2+1]*2-1;if(E===0)U8.set(1,P,C);else if(E===1)U8.set(-C,1,-P);else if(E===2)U8.set(-C,P,1);else if(E===3)U8.set(-1,P,-C);else if(E===4)U8.set(-C,-1,P);else U8.set(C,P,-1);U8.toArray(I,(E*G+z)*D)}}let F=new gJ;if(F.setAttribute("position",new K9(M,D)),F.setAttribute("outputDirection",new K9(I,D)),$.push(new zJ(F,null)),Z>d8)Z--}return{lodMeshes:$,sizeLods:Q}}function PK(J,Q,$){let Z=new cJ(J,Q,$);return Z.texture.mapping=K7,Z.texture.name="PMREM.cubeUv",Z.scissorTest=!0,Z}function l8(J,Q,$,Z,K){J.viewport.set(Q,$,Z,K),J.scissor.set(Q,$,Z,K)}function yU(J,Q,$){return new SJ({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:TU,CUBEUV_TEXEL_WIDTH:1/Q,CUBEUV_TEXEL_HEIGHT:1/$,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:q6(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:E9,depthTest:!1,depthWrite:!1})}function fU(J,Q,$){return new SJ({name:"SphericalGaussianBlur",defines:{SAMPLES:_U,CUBEUV_TEXEL_WIDTH:1/Q,CUBEUV_TEXEL_HEIGHT:1/$,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:q6(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:E9,depthTest:!1,depthWrite:!1})}function wK(){return new SJ({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:q6(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:E9,depthTest:!1,depthWrite:!1})}function _K(){return new SJ({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:q6(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:E9,depthTest:!1,depthWrite:!1})}function q6(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}class z$ extends cJ{constructor(J=1,Q={}){super(J,J,Q);this.isWebGLCubeRenderTarget=!0;let $={width:J,height:J,depth:1},Z=[$,$,$,$,$,$];this.texture=new K6(Z),this._setTextureOptions(Q),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(J,Q){this.texture.type=Q.type,this.texture.colorSpace=Q.colorSpace,this.texture.generateMipmaps=Q.generateMipmaps,this.texture.minFilter=Q.minFilter,this.texture.magFilter=Q.magFilter;let $={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},Z=new l9(5,5,5),K=new SJ({name:"CubemapFromEquirect",uniforms:W8($.uniforms),vertexShader:$.vertexShader,fragmentShader:$.fragmentShader,side:bJ,blending:E9});K.uniforms.tEquirect.value=Q;let W=new zJ(Z,K),H=Q.minFilter;if(Q.minFilter===r9)Q.minFilter=xJ;return new U$(1,10,this).update(J,W),Q.minFilter=H,W.geometry.dispose(),W.material.dispose(),this}clear(J,Q=!0,$=!0,Z=!0){let K=J.getRenderTarget();for(let W=0;W<6;W++)J.setRenderTarget(this,W),J.clear(Q,$,Z);J.setRenderTarget(K)}}function vU(J){let Q=new WeakMap,$=new WeakMap,Z=null;function K(G,D=!1){if(G===null||G===void 0)return null;if(D)return H(G);return W(G)}function W(G){if(G&&G.isTexture){let D=G.mapping;if(D===m7||D===l7)if(Q.has(G)){let M=Q.get(G).texture;return Y(M,G.mapping)}else{let M=G.image;if(M&&M.height>0){let I=new z$(M.height);return I.fromEquirectangularTexture(J,G),Q.set(G,I),G.addEventListener("dispose",U),Y(I.texture,G.mapping)}else return null}}return G}function H(G){if(G&&G.isTexture){let D=G.mapping,M=D===m7||D===l7,I=D===h8||D===a9;if(M||I){let F=$.get(G),E=F!==void 0?F.texture.pmremVersion:0;if(G.isRenderTargetTexture&&G.pmremVersion!==E){if(Z===null)Z=new V$(J);return F=M?Z.fromEquirectangular(G,F):Z.fromCubemap(G,F),F.texture.pmremVersion=G.pmremVersion,$.set(G,F),F.texture}else if(F!==void 0)return F.texture;else{let A=G.image;if(M&&A&&A.height>0||I&&A&&X(A)){if(Z===null)Z=new V$(J);return F=M?Z.fromEquirectangular(G):Z.fromCubemap(G),F.texture.pmremVersion=G.pmremVersion,$.set(G,F),G.addEventListener("dispose",N),F.texture}else return null}}}return G}function Y(G,D){if(D===m7)G.mapping=h8;else if(D===l7)G.mapping=a9;return G}function X(G){let D=0,M=6;for(let I=0;I<M;I++)if(G[I]!==void 0)D++;return D===M}function U(G){let D=G.target;D.removeEventListener("dispose",U);let M=Q.get(D);if(M!==void 0)Q.delete(D),M.dispose()}function N(G){let D=G.target;D.removeEventListener("dispose",N);let M=$.get(D);if(M!==void 0)$.delete(D),M.dispose()}function q(){if(Q=new WeakMap,$=new WeakMap,Z!==null)Z.dispose(),Z=null}return{get:K,dispose:q}}function hU(J){let Q={};function $(Z){if(Q[Z]!==void 0)return Q[Z];let K=J.getExtension(Z);return Q[Z]=K,K}return{has:function(Z){return $(Z)!==null},init:function(){$("EXT_color_buffer_float"),$("WEBGL_clip_cull_distance"),$("OES_texture_float_linear"),$("EXT_color_buffer_half_float"),$("WEBGL_multisampled_render_to_texture"),$("WEBGL_render_shared_exponent")},get:function(Z){let K=$(Z);if(K===null)o9("WebGLRenderer: "+Z+" extension not supported.");return K}}}function bU(J,Q,$,Z){let K={},W=new WeakMap;function H(q){let G=q.target;if(G.index!==null)Q.remove(G.index);for(let M in G.attributes)Q.remove(G.attributes[M]);G.removeEventListener("dispose",H),delete K[G.id];let D=W.get(G);if(D)Q.remove(D),W.delete(G);if(Z.releaseStatesOfGeometry(G),G.isInstancedBufferGeometry===!0)delete G._maxInstanceCount;$.memory.geometries--}function Y(q,G){if(K[G.id]===!0)return G;return G.addEventListener("dispose",H),K[G.id]=!0,$.memory.geometries++,G}function X(q){let G=q.attributes;for(let D in G)Q.update(G[D],J.ARRAY_BUFFER)}function U(q){let G=[],D=q.index,M=q.attributes.position,I=0;if(M===void 0)return;if(D!==null){let A=D.array;I=D.version;for(let _=0,V=A.length;_<V;_+=3){let z=A[_+0],C=A[_+1],P=A[_+2];G.push(z,C,C,P,P,z)}}else{let A=M.array;I=M.version;for(let _=0,V=A.length/3-1;_<V;_+=3){let z=_+0,C=_+1,P=_+2;G.push(z,C,C,P,P,z)}}let F=new(M.count>=65535?$6:Q6)(G,1);F.version=I;let E=W.get(q);if(E)Q.remove(E);W.set(q,F)}function N(q){let G=W.get(q);if(G){let D=q.index;if(D!==null){if(G.version<D.version)U(q)}}else U(q);return W.get(q)}return{get:Y,update:X,getWireframeAttribute:N}}function xU(J,Q,$){let Z;function K(q){Z=q}let W,H;function Y(q){W=q.type,H=q.bytesPerElement}function X(q,G){J.drawElements(Z,G,W,q*H),$.update(G,Z,1)}function U(q,G,D){if(D===0)return;J.drawElementsInstanced(Z,G,W,q*H,D),$.update(G,Z,D)}function N(q,G,D){if(D===0)return;Q.get("WEBGL_multi_draw").multiDrawElementsWEBGL(Z,G,0,W,q,0,D);let I=0;for(let F=0;F<D;F++)I+=G[F];$.update(I,Z,1)}this.setMode=K,this.setIndex=Y,this.render=X,this.renderInstances=U,this.renderMultiDraw=N}function gU(J){let Q={geometries:0,textures:0},$={frame:0,calls:0,triangles:0,points:0,lines:0};function Z(W,H,Y){switch($.calls++,H){case J.TRIANGLES:$.triangles+=Y*(W/3);break;case J.LINES:$.lines+=Y*(W/2);break;case J.LINE_STRIP:$.lines+=Y*(W-1);break;case J.LINE_LOOP:$.lines+=Y*W;break;case J.POINTS:$.points+=Y*W;break;default:S0("WebGLInfo: Unknown draw mode:",H);break}}function K(){$.calls=0,$.triangles=0,$.points=0,$.lines=0}return{memory:Q,render:$,programs:null,autoReset:!0,reset:K,update:Z}}function pU(J,Q,$){let Z=new WeakMap,K=new UJ;function W(H,Y,X){let U=H.morphTargetInfluences,N=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,q=N!==void 0?N.length:0,G=Z.get(Y);if(G===void 0||G.count!==q){let B=function(){P.dispose(),Z.delete(Y),Y.removeEventListener("dispose",B)};if(G!==void 0)G.texture.dispose();let D=Y.morphAttributes.position!==void 0,M=Y.morphAttributes.normal!==void 0,I=Y.morphAttributes.color!==void 0,F=Y.morphAttributes.position||[],E=Y.morphAttributes.normal||[],A=Y.morphAttributes.color||[],_=0;if(D===!0)_=1;if(M===!0)_=2;if(I===!0)_=3;let V=Y.attributes.position.count*_,z=1;if(V>Q.maxTextureSize)z=Math.ceil(V/Q.maxTextureSize),V=Q.maxTextureSize;let C=new Float32Array(V*z*4*q),P=new e7(C,V,z,q);P.type=P9,P.needsUpdate=!0;let L=_*4;for(let l=0;l<q;l++){let v=F[l],h=E[l],r=A[l],j=V*z*4*l;for(let d=0;d<v.count;d++){let o=d*L;if(D===!0)K.fromBufferAttribute(v,d),C[j+o+0]=K.x,C[j+o+1]=K.y,C[j+o+2]=K.z,C[j+o+3]=0;if(M===!0)K.fromBufferAttribute(h,d),C[j+o+4]=K.x,C[j+o+5]=K.y,C[j+o+6]=K.z,C[j+o+7]=0;if(I===!0)K.fromBufferAttribute(r,d),C[j+o+8]=K.x,C[j+o+9]=K.y,C[j+o+10]=K.z,C[j+o+11]=r.itemSize===4?K.w:1}}G={count:q,texture:P,size:new w0(V,z)},Z.set(Y,G),Y.addEventListener("dispose",B)}if(H.isInstancedMesh===!0&&H.morphTexture!==null)X.getUniforms().setValue(J,"morphTexture",H.morphTexture,$);else{let D=0;for(let I=0;I<U.length;I++)D+=U[I];let M=Y.morphTargetsRelative?1:1-D;X.getUniforms().setValue(J,"morphTargetBaseInfluence",M),X.getUniforms().setValue(J,"morphTargetInfluences",U)}X.getUniforms().setValue(J,"morphTargetsTexture",G.texture,$),X.getUniforms().setValue(J,"morphTargetsTextureSize",G.size)}return{update:W}}function mU(J,Q,$,Z,K){let W=new WeakMap;function H(U){let N=K.render.frame,q=U.geometry,G=Q.get(U,q);if(W.get(G)!==N)Q.update(G),W.set(G,N);if(U.isInstancedMesh){if(U.hasEventListener("dispose",X)===!1)U.addEventListener("dispose",X);if(W.get(U)!==N){if($.update(U.instanceMatrix,J.ARRAY_BUFFER),U.instanceColor!==null)$.update(U.instanceColor,J.ARRAY_BUFFER);W.set(U,N)}}if(U.isSkinnedMesh){let D=U.skeleton;if(W.get(D)!==N)D.update(),W.set(D,N)}return G}function Y(){W=new WeakMap}function X(U){let N=U.target;if(N.removeEventListener("dispose",X),Z.releaseStatesOfObject(N),$.remove(N.instanceMatrix),N.instanceColor!==null)$.remove(N.instanceColor)}return{update:H,dispose:Y}}var lU={[s6]:"LINEAR_TONE_MAPPING",[i6]:"REINHARD_TONE_MAPPING",[o6]:"CINEON_TONE_MAPPING",[a6]:"ACES_FILMIC_TONE_MAPPING",[t6]:"AGX_TONE_MAPPING",[e6]:"NEUTRAL_TONE_MAPPING",[r6]:"CUSTOM_TONE_MAPPING"};function dU(J,Q,$,Z,K,W){let H=new cJ(Q,$,{type:J,depthBuffer:K,stencilBuffer:W,samples:Z?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),Y=null,X=null,U=new gJ;U.setAttribute("position",new IJ([-1,3,0,-1,-1,0,3,-1,0],3)),U.setAttribute("uv",new IJ([0,2,0,0,2,0],2));let N=new aQ({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),q=new zJ(U,N),G=new m8(-1,1,1,-1,0,1),D=null,M=null,I=!1,F,E=null,A=[],_=!1;this.setSize=function(V,z){if(H.setSize(V,z),Y!==null)Y.setSize(V,z);if(X!==null)X.setSize(V,z);for(let C=0;C<A.length;C++){let P=A[C];if(P.setSize)P.setSize(V,z)}},this.setEffects=function(V){A=V,_=A.length>0&&A[0].isRenderPass===!0;let{width:z,height:C}=H;if(A.length>0&&Y===null)Y=new cJ(z,C,{type:F9,depthBuffer:!1,stencilBuffer:!1}),X=new cJ(z,C,{type:F9,depthBuffer:!1,stencilBuffer:!1});for(let P=0;P<A.length;P++){let L=A[P];if(L.setSize)L.setSize(z,C)}},this.begin=function(V,z){if(I)return!1;if(V.toneMapping===H9&&A.length===0)return!1;if(E=z,z!==null){let{width:C,height:P}=z;if(H.width!==C||H.height!==P)this.setSize(C,P)}if(_===!1)V.setRenderTarget(H);return F=V.toneMapping,V.toneMapping=H9,!0},this.hasRenderPass=function(){return _},this.end=function(V,z){V.toneMapping=F,I=!0;let C=H,P=Y;for(let L=0;L<A.length;L++){let B=A[L];if(B.enabled===!1)continue;if(B.render(V,P,C,z),B.needsSwap!==!1)C=P,P=P===Y?X:Y}if(D!==V.outputColorSpace||M!==V.toneMapping){if(D=V.outputColorSpace,M=V.toneMapping,N.defines={},m0.getTransfer(D)===JJ)N.defines.SRGB_TRANSFER="";let L=lU[M];if(L)N.defines[L]="";N.needsUpdate=!0}N.uniforms.tDiffuse.value=C.texture,V.setRenderTarget(E),V.render(q,G),E=null,I=!1},this.isCompositing=function(){return I},this.dispose=function(){if(H.dispose(),Y!==null)Y.dispose();if(X!==null)X.dispose();U.dispose(),N.dispose()}}var oK=new wJ,B$=new Z8(1,1),aK=new e7,rK=new nQ,tK=new K6,TK=[],SK=[],jK=new Float32Array(16),yK=new Float32Array(9),fK=new Float32Array(4);function u8(J,Q,$){let Z=J[0];if(Z<=0||Z>0)return J;let K=Q*$,W=TK[K];if(W===void 0)W=new Float32Array(K),TK[K]=W;if(Q!==0){Z.toArray(W,0);for(let H=1,Y=0;H!==Q;++H)Y+=$,J[H].toArray(W,Y)}return W}function RJ(J,Q){if(J.length!==Q.length)return!1;for(let $=0,Z=J.length;$<Z;$++)if(J[$]!==Q[$])return!1;return!0}function MJ(J,Q){for(let $=0,Z=Q.length;$<Z;$++)J[$]=Q[$]}function E6(J,Q){let $=SK[Q];if($===void 0)$=new Int32Array(Q),SK[Q]=$;for(let Z=0;Z!==Q;++Z)$[Z]=J.allocateTextureUnit();return $}function uU(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1f(this.addr,Q),$[0]=Q}function cU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2f(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(RJ($,Q))return;J.uniform2fv(this.addr,Q),MJ($,Q)}}function nU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3f(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else if(Q.r!==void 0){if($[0]!==Q.r||$[1]!==Q.g||$[2]!==Q.b)J.uniform3f(this.addr,Q.r,Q.g,Q.b),$[0]=Q.r,$[1]=Q.g,$[2]=Q.b}else{if(RJ($,Q))return;J.uniform3fv(this.addr,Q),MJ($,Q)}}function sU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4f(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(RJ($,Q))return;J.uniform4fv(this.addr,Q),MJ($,Q)}}function iU(J,Q){let $=this.cache,Z=Q.elements;if(Z===void 0){if(RJ($,Q))return;J.uniformMatrix2fv(this.addr,!1,Q),MJ($,Q)}else{if(RJ($,Z))return;fK.set(Z),J.uniformMatrix2fv(this.addr,!1,fK),MJ($,Z)}}function oU(J,Q){let $=this.cache,Z=Q.elements;if(Z===void 0){if(RJ($,Q))return;J.uniformMatrix3fv(this.addr,!1,Q),MJ($,Q)}else{if(RJ($,Z))return;yK.set(Z),J.uniformMatrix3fv(this.addr,!1,yK),MJ($,Z)}}function aU(J,Q){let $=this.cache,Z=Q.elements;if(Z===void 0){if(RJ($,Q))return;J.uniformMatrix4fv(this.addr,!1,Q),MJ($,Q)}else{if(RJ($,Z))return;jK.set(Z),J.uniformMatrix4fv(this.addr,!1,jK),MJ($,Z)}}function rU(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1i(this.addr,Q),$[0]=Q}function tU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2i(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(RJ($,Q))return;J.uniform2iv(this.addr,Q),MJ($,Q)}}function eU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3i(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else{if(RJ($,Q))return;J.uniform3iv(this.addr,Q),MJ($,Q)}}function JG(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4i(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(RJ($,Q))return;J.uniform4iv(this.addr,Q),MJ($,Q)}}function QG(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1ui(this.addr,Q),$[0]=Q}function $G(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2ui(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(RJ($,Q))return;J.uniform2uiv(this.addr,Q),MJ($,Q)}}function ZG(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3ui(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else{if(RJ($,Q))return;J.uniform3uiv(this.addr,Q),MJ($,Q)}}function KG(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4ui(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(RJ($,Q))return;J.uniform4uiv(this.addr,Q),MJ($,Q)}}function WG(J,Q,$){let Z=this.cache,K=$.allocateTextureUnit();if(Z[0]!==K)J.uniform1i(this.addr,K),Z[0]=K;let W;if(this.type===J.SAMPLER_2D_SHADOW)B$.compareFunction=$.isReversedDepthBuffer()?t7:r7,W=B$;else W=oK;$.setTexture2D(Q||W,K)}function HG(J,Q,$){let Z=this.cache,K=$.allocateTextureUnit();if(Z[0]!==K)J.uniform1i(this.addr,K),Z[0]=K;$.setTexture3D(Q||rK,K)}function YG(J,Q,$){let Z=this.cache,K=$.allocateTextureUnit();if(Z[0]!==K)J.uniform1i(this.addr,K),Z[0]=K;$.setTextureCube(Q||tK,K)}function XG(J,Q,$){let Z=this.cache,K=$.allocateTextureUnit();if(Z[0]!==K)J.uniform1i(this.addr,K),Z[0]=K;$.setTexture2DArray(Q||aK,K)}function UG(J){switch(J){case 5126:return uU;case 35664:return cU;case 35665:return nU;case 35666:return sU;case 35674:return iU;case 35675:return oU;case 35676:return aU;case 5124:case 35670:return rU;case 35667:case 35671:return tU;case 35668:case 35672:return eU;case 35669:case 35673:return JG;case 5125:return QG;case 36294:return $G;case 36295:return ZG;case 36296:return KG;case 35678:case 36198:case 36298:case 36306:case 35682:return WG;case 35679:case 36299:case 36307:return HG;case 35680:case 36300:case 36308:case 36293:return YG;case 36289:case 36303:case 36311:case 36292:return XG}}function GG(J,Q){J.uniform1fv(this.addr,Q)}function NG(J,Q){let $=u8(Q,this.size,2);J.uniform2fv(this.addr,$)}function qG(J,Q){let $=u8(Q,this.size,3);J.uniform3fv(this.addr,$)}function EG(J,Q){let $=u8(Q,this.size,4);J.uniform4fv(this.addr,$)}function FG(J,Q){let $=u8(Q,this.size,4);J.uniformMatrix2fv(this.addr,!1,$)}function DG(J,Q){let $=u8(Q,this.size,9);J.uniformMatrix3fv(this.addr,!1,$)}function OG(J,Q){let $=u8(Q,this.size,16);J.uniformMatrix4fv(this.addr,!1,$)}function RG(J,Q){J.uniform1iv(this.addr,Q)}function MG(J,Q){J.uniform2iv(this.addr,Q)}function LG(J,Q){J.uniform3iv(this.addr,Q)}function kG(J,Q){J.uniform4iv(this.addr,Q)}function VG(J,Q){J.uniform1uiv(this.addr,Q)}function BG(J,Q){J.uniform2uiv(this.addr,Q)}function IG(J,Q){J.uniform3uiv(this.addr,Q)}function zG(J,Q){J.uniform4uiv(this.addr,Q)}function AG(J,Q,$){let Z=this.cache,K=Q.length,W=E6($,K);if(!RJ(Z,W))J.uniform1iv(this.addr,W),MJ(Z,W);let H;if(this.type===J.SAMPLER_2D_SHADOW)H=B$;else H=oK;for(let Y=0;Y!==K;++Y)$.setTexture2D(Q[Y]||H,W[Y])}function CG(J,Q,$){let Z=this.cache,K=Q.length,W=E6($,K);if(!RJ(Z,W))J.uniform1iv(this.addr,W),MJ(Z,W);for(let H=0;H!==K;++H)$.setTexture3D(Q[H]||rK,W[H])}function PG(J,Q,$){let Z=this.cache,K=Q.length,W=E6($,K);if(!RJ(Z,W))J.uniform1iv(this.addr,W),MJ(Z,W);for(let H=0;H!==K;++H)$.setTextureCube(Q[H]||tK,W[H])}function wG(J,Q,$){let Z=this.cache,K=Q.length,W=E6($,K);if(!RJ(Z,W))J.uniform1iv(this.addr,W),MJ(Z,W);for(let H=0;H!==K;++H)$.setTexture2DArray(Q[H]||aK,W[H])}function _G(J){switch(J){case 5126:return GG;case 35664:return NG;case 35665:return qG;case 35666:return EG;case 35674:return FG;case 35675:return DG;case 35676:return OG;case 5124:case 35670:return RG;case 35667:case 35671:return MG;case 35668:case 35672:return LG;case 35669:case 35673:return kG;case 5125:return VG;case 36294:return BG;case 36295:return IG;case 36296:return zG;case 35678:case 36198:case 36298:case 36306:case 35682:return AG;case 35679:case 36299:case 36307:return CG;case 35680:case 36300:case 36308:case 36293:return PG;case 36289:case 36303:case 36311:case 36292:return wG}}class eK{constructor(J,Q,$){this.id=J,this.addr=$,this.cache=[],this.type=Q.type,this.setValue=UG(Q.type)}}class JW{constructor(J,Q,$){this.id=J,this.addr=$,this.cache=[],this.type=Q.type,this.size=Q.size,this.setValue=_G(Q.type)}}class QW{constructor(J){this.id=J,this.seq=[],this.map={}}setValue(J,Q,$){let Z=this.seq;for(let K=0,W=Z.length;K!==W;++K){let H=Z[K];H.setValue(J,Q[H.id],$)}}}var L$=/(\w+)(\])?(\[|\.)?/g;function vK(J,Q){J.seq.push(Q),J.map[Q.id]=Q}function TG(J,Q,$){let Z=J.name,K=Z.length;L$.lastIndex=0;while(!0){let W=L$.exec(Z),H=L$.lastIndex,Y=W[1],X=W[2]==="]",U=W[3];if(X)Y=Y|0;if(U===void 0||U==="["&&H+2===K){vK($,U===void 0?new eK(Y,J,Q):new JW(Y,J,Q));break}else{let q=$.map[Y];if(q===void 0)q=new QW(Y),vK($,q);$=q}}}class O7{constructor(J,Q){this.seq=[],this.map={};let $=J.getProgramParameter(Q,J.ACTIVE_UNIFORMS);for(let W=0;W<$;++W){let H=J.getActiveUniform(Q,W),Y=J.getUniformLocation(Q,H.name);TG(H,Y,this)}let Z=[],K=[];for(let W of this.seq)if(W.type===J.SAMPLER_2D_SHADOW||W.type===J.SAMPLER_CUBE_SHADOW||W.type===J.SAMPLER_2D_ARRAY_SHADOW)Z.push(W);else K.push(W);if(Z.length>0)this.seq=Z.concat(K)}setValue(J,Q,$,Z){let K=this.map[Q];if(K!==void 0)K.setValue(J,$,Z)}setOptional(J,Q,$){let Z=Q[$];if(Z!==void 0)this.setValue(J,$,Z)}static upload(J,Q,$,Z){for(let K=0,W=Q.length;K!==W;++K){let H=Q[K],Y=$[H.id];if(Y.needsUpdate!==!1)H.setValue(J,Y.value,Z)}}static seqWithValue(J,Q){let $=[];for(let Z=0,K=J.length;Z!==K;++Z){let W=J[Z];if(W.id in Q)$.push(W)}return $}}function hK(J,Q,$){let Z=J.createShader(Q);return J.shaderSource(Z,$),J.compileShader(Z),Z}var SG=37297,jG=0;function yG(J,Q){let $=J.split(`
`),Z=[],K=Math.max(Q-6,0),W=Math.min(Q+6,$.length);for(let H=K;H<W;H++){let Y=H+1;Z.push(`${Y===Q?">":" "} ${Y}: ${$[H]}`)}return Z.join(`
`)}var bK=new j0;function fG(J){m0._getMatrix(bK,m0.workingColorSpace,J);let Q=`mat3( ${bK.elements.map(($)=>$.toFixed(4))} )`;switch(m0.getTransfer(J)){case xQ:return[Q,"LinearTransferOETF"];case JJ:return[Q,"sRGBTransferOETF"];default:return P0("WebGLProgram: Unsupported color space: ",J),[Q,"LinearTransferOETF"]}}function xK(J,Q,$){let Z=J.getShaderParameter(Q,J.COMPILE_STATUS),W=(J.getShaderInfoLog(Q)||"").trim();if(Z&&W==="")return"";let H=/ERROR: 0:(\d+)/.exec(W);if(H){let Y=parseInt(H[1]);return $.toUpperCase()+`

`+W+`

`+yG(J.getShaderSource(Q),Y)}else return W}function vG(J,Q){let $=fG(Q);return[`vec4 ${J}( vec4 value ) {`,`	return ${$[1]}( vec4( value.rgb * ${$[0]}, value.a ) );`,"}"].join(`
`)}var hG={[s6]:"Linear",[i6]:"Reinhard",[o6]:"Cineon",[a6]:"ACESFilmic",[t6]:"AgX",[e6]:"Neutral",[r6]:"Custom"};function bG(J,Q){let $=hG[Q];if($===void 0)return P0("WebGLProgram: Unsupported toneMapping:",Q),"vec3 "+J+"( vec3 color ) { return LinearToneMapping( color ); }";return"vec3 "+J+"( vec3 color ) { return "+$+"ToneMapping( color ); }"}var N6=new f;function xG(){m0.getLuminanceCoefficients(N6);let J=N6.x.toFixed(4),Q=N6.y.toFixed(4),$=N6.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${J}, ${Q}, ${$} );`,"\treturn dot( weights, rgb );","}"].join(`
`)}function gG(J){return[J.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",J.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(D7).join(`
`)}function pG(J){let Q=[];for(let $ in J){let Z=J[$];if(Z===!1)continue;Q.push("#define "+$+" "+Z)}return Q.join(`
`)}function mG(J,Q){let $={},Z=J.getProgramParameter(Q,J.ACTIVE_ATTRIBUTES);for(let K=0;K<Z;K++){let W=J.getActiveAttrib(Q,K),H=W.name,Y=1;if(W.type===J.FLOAT_MAT2)Y=2;if(W.type===J.FLOAT_MAT3)Y=3;if(W.type===J.FLOAT_MAT4)Y=4;$[H]={type:W.type,location:J.getAttribLocation(Q,H),locationSize:Y}}return $}function D7(J){return J!==""}function gK(J,Q){let $=Q.numSpotLightShadows+Q.numSpotLightMaps-Q.numSpotLightShadowsWithMaps;return J.replace(/NUM_SUN_LIGHTS/g,Q.numSunLights).replace(/NUM_DIR_LIGHTS/g,Q.numDirLights).replace(/NUM_SPOT_LIGHTS/g,Q.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,Q.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,$).replace(/NUM_RECT_AREA_LIGHTS/g,Q.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,Q.numPointLights).replace(/NUM_HEMI_LIGHTS/g,Q.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,Q.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,Q.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,Q.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,Q.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,Q.numPointLightShadows)}function pK(J,Q){return J.replace(/NUM_CLIPPING_PLANES/g,Q.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,Q.numClippingPlanes-Q.numClipIntersection)}var lG=/^[ \t]*#include +<([\w\d./]+)>/gm;function I$(J){return J.replace(lG,uG)}var dG=new Map;function uG(J,Q){let $=v0[Q];if($===void 0){let Z=dG.get(Q);if(Z!==void 0)$=v0[Z],P0('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',Q,Z);else throw Error("THREE.WebGLProgram: Can not resolve #include <"+Q+">")}return I$($)}var cG=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function mK(J){return J.replace(cG,nG)}function nG(J,Q,$,Z){let K="";for(let W=parseInt(Q);W<parseInt($);W++)K+=Z.replace(/\[\s*i\s*\]/g,"[ "+W+" ]").replace(/UNROLLED_LOOP_INDEX/g,W);return K}function lK(J){let Q=`precision ${J.precision} float;
	precision ${J.precision} int;
	precision ${J.precision} sampler2D;
	precision ${J.precision} samplerCube;
	precision ${J.precision} sampler3D;
	precision ${J.precision} sampler2DArray;
	precision ${J.precision} sampler2DShadow;
	precision ${J.precision} samplerCubeShadow;
	precision ${J.precision} sampler2DArrayShadow;
	precision ${J.precision} isampler2D;
	precision ${J.precision} isampler3D;
	precision ${J.precision} isamplerCube;
	precision ${J.precision} isampler2DArray;
	precision ${J.precision} usampler2D;
	precision ${J.precision} usampler3D;
	precision ${J.precision} usamplerCube;
	precision ${J.precision} usampler2DArray;
	`;if(J.precision==="highp")Q+=`
#define HIGH_PRECISION`;else if(J.precision==="mediump")Q+=`
#define MEDIUM_PRECISION`;else if(J.precision==="lowp")Q+=`
#define LOW_PRECISION`;return Q}var sG={[$7]:"SHADOWMAP_TYPE_PCF",[y8]:"SHADOWMAP_TYPE_VSM"};function iG(J){return sG[J.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var oG={[h8]:"ENVMAP_TYPE_CUBE",[a9]:"ENVMAP_TYPE_CUBE",[K7]:"ENVMAP_TYPE_CUBE_UV"};function aG(J){if(J.envMap===!1)return"ENVMAP_TYPE_CUBE";return oG[J.envMapMode]||"ENVMAP_TYPE_CUBE"}var rG={[a9]:"ENVMAP_MODE_REFRACTION"};function tG(J){if(J.envMap===!1)return"ENVMAP_MODE_REFLECTION";return rG[J.envMapMode]||"ENVMAP_MODE_REFLECTION"}var eG={[aZ]:"ENVMAP_BLENDING_MULTIPLY",[rZ]:"ENVMAP_BLENDING_MIX",[tZ]:"ENVMAP_BLENDING_ADD"};function JN(J){if(J.envMap===!1)return"ENVMAP_BLENDING_NONE";return eG[J.combine]||"ENVMAP_BLENDING_NONE"}function QN(J){let Q=J.envMapCubeUVHeight;if(Q===null)return null;let $=Math.log2(Q)-2,Z=1/Q;return{texelWidth:1/(3*Math.max(Math.pow(2,$),112)),texelHeight:Z,maxMip:$}}function $N(J,Q,$,Z){let K=J.getContext(),W=$.defines,H=$.vertexShader,Y=$.fragmentShader,X=iG($),U=aG($),N=tG($),q=JN($),G=QN($),D=gG($),M=pG(W),I=K.createProgram(),F,E,A=$.glslVersion?"#version "+$.glslVersion+`
`:"";if($.isRawShaderMaterial){if(F=["#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,M].filter(D7).join(`
`),F.length>0)F+=`
`;if(E=["#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,M].filter(D7).join(`
`),E.length>0)E+=`
`}else F=[lK($),"#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,M,$.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",$.batching?"#define USE_BATCHING":"",$.batchingColor?"#define USE_BATCHING_COLOR":"",$.instancing?"#define USE_INSTANCING":"",$.instancingColor?"#define USE_INSTANCING_COLOR":"",$.instancingMorph?"#define USE_INSTANCING_MORPH":"",$.useFog&&$.fog?"#define USE_FOG":"",$.useFog&&$.fogExp2?"#define FOG_EXP2":"",$.map?"#define USE_MAP":"",$.envMap?"#define USE_ENVMAP":"",$.envMap?"#define "+N:"",$.lightMap?"#define USE_LIGHTMAP":"",$.aoMap?"#define USE_AOMAP":"",$.bumpMap?"#define USE_BUMPMAP":"",$.normalMap?"#define USE_NORMALMAP":"",$.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",$.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",$.displacementMap?"#define USE_DISPLACEMENTMAP":"",$.emissiveMap?"#define USE_EMISSIVEMAP":"",$.anisotropy?"#define USE_ANISOTROPY":"",$.anisotropyMap?"#define USE_ANISOTROPYMAP":"",$.clearcoatMap?"#define USE_CLEARCOATMAP":"",$.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",$.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",$.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",$.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",$.specularMap?"#define USE_SPECULARMAP":"",$.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",$.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",$.roughnessMap?"#define USE_ROUGHNESSMAP":"",$.metalnessMap?"#define USE_METALNESSMAP":"",$.alphaMap?"#define USE_ALPHAMAP":"",$.alphaHash?"#define USE_ALPHAHASH":"",$.transmission?"#define USE_TRANSMISSION":"",$.transmissionMap?"#define USE_TRANSMISSIONMAP":"",$.thicknessMap?"#define USE_THICKNESSMAP":"",$.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",$.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",$.mapUv?"#define MAP_UV "+$.mapUv:"",$.alphaMapUv?"#define ALPHAMAP_UV "+$.alphaMapUv:"",$.lightMapUv?"#define LIGHTMAP_UV "+$.lightMapUv:"",$.aoMapUv?"#define AOMAP_UV "+$.aoMapUv:"",$.emissiveMapUv?"#define EMISSIVEMAP_UV "+$.emissiveMapUv:"",$.bumpMapUv?"#define BUMPMAP_UV "+$.bumpMapUv:"",$.normalMapUv?"#define NORMALMAP_UV "+$.normalMapUv:"",$.displacementMapUv?"#define DISPLACEMENTMAP_UV "+$.displacementMapUv:"",$.metalnessMapUv?"#define METALNESSMAP_UV "+$.metalnessMapUv:"",$.roughnessMapUv?"#define ROUGHNESSMAP_UV "+$.roughnessMapUv:"",$.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+$.anisotropyMapUv:"",$.clearcoatMapUv?"#define CLEARCOATMAP_UV "+$.clearcoatMapUv:"",$.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+$.clearcoatNormalMapUv:"",$.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+$.clearcoatRoughnessMapUv:"",$.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+$.iridescenceMapUv:"",$.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+$.iridescenceThicknessMapUv:"",$.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+$.sheenColorMapUv:"",$.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+$.sheenRoughnessMapUv:"",$.specularMapUv?"#define SPECULARMAP_UV "+$.specularMapUv:"",$.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+$.specularColorMapUv:"",$.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+$.specularIntensityMapUv:"",$.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+$.transmissionMapUv:"",$.thicknessMapUv?"#define THICKNESSMAP_UV "+$.thicknessMapUv:"",$.vertexTangents&&$.flatShading===!1?"#define USE_TANGENT":"",$.vertexNormals?"#define HAS_NORMAL":"",$.vertexColors?"#define USE_COLOR":"",$.vertexAlphas?"#define USE_COLOR_ALPHA":"",$.vertexUv1s?"#define USE_UV1":"",$.vertexUv2s?"#define USE_UV2":"",$.vertexUv3s?"#define USE_UV3":"",$.pointsUvs?"#define USE_POINTS_UV":"",$.flatShading?"#define FLAT_SHADED":"",$.skinning?"#define USE_SKINNING":"",$.morphTargets?"#define USE_MORPHTARGETS":"",$.morphNormals&&$.flatShading===!1?"#define USE_MORPHNORMALS":"",$.morphColors?"#define USE_MORPHCOLORS":"",$.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+$.morphTextureStride:"",$.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+$.morphTargetsCount:"",$.doubleSided?"#define DOUBLE_SIDED":"",$.flipSided?"#define FLIP_SIDED":"",$.shadowMapEnabled?"#define USE_SHADOWMAP":"",$.shadowMapEnabled?"#define "+X:"",$.sizeAttenuation?"#define USE_SIZEATTENUATION":"",$.numLightProbes>0?"#define USE_LIGHT_PROBES":"",$.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",$.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","\tattribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","\tattribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","\tuniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","\tattribute vec2 uv1;","#endif","#ifdef USE_UV2","\tattribute vec2 uv2;","#endif","#ifdef USE_UV3","\tattribute vec2 uv3;","#endif","#ifdef USE_TANGENT","\tattribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","\tattribute vec4 color;","#elif defined( USE_COLOR )","\tattribute vec3 color;","#endif","#ifdef USE_SKINNING","\tattribute vec4 skinIndex;","\tattribute vec4 skinWeight;","#endif",`
`].filter(D7).join(`
`),E=[lK($),"#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,M,$.useFog&&$.fog?"#define USE_FOG":"",$.useFog&&$.fogExp2?"#define FOG_EXP2":"",$.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",$.map?"#define USE_MAP":"",$.matcap?"#define USE_MATCAP":"",$.envMap?"#define USE_ENVMAP":"",$.envMap?"#define "+U:"",$.envMap?"#define "+N:"",$.envMap?"#define "+q:"",G?"#define CUBEUV_TEXEL_WIDTH "+G.texelWidth:"",G?"#define CUBEUV_TEXEL_HEIGHT "+G.texelHeight:"",G?"#define CUBEUV_MAX_MIP "+G.maxMip+".0":"",$.lightMap?"#define USE_LIGHTMAP":"",$.aoMap?"#define USE_AOMAP":"",$.bumpMap?"#define USE_BUMPMAP":"",$.normalMap?"#define USE_NORMALMAP":"",$.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",$.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",$.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",$.emissiveMap?"#define USE_EMISSIVEMAP":"",$.anisotropy?"#define USE_ANISOTROPY":"",$.anisotropyMap?"#define USE_ANISOTROPYMAP":"",$.clearcoat?"#define USE_CLEARCOAT":"",$.clearcoatMap?"#define USE_CLEARCOATMAP":"",$.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",$.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",$.dispersion?"#define USE_DISPERSION":"",$.retroreflection?"#define USE_RETROREFLECTION":"",$.iridescence?"#define USE_IRIDESCENCE":"",$.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",$.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",$.specularMap?"#define USE_SPECULARMAP":"",$.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",$.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",$.roughnessMap?"#define USE_ROUGHNESSMAP":"",$.metalnessMap?"#define USE_METALNESSMAP":"",$.alphaMap?"#define USE_ALPHAMAP":"",$.alphaTest?"#define USE_ALPHATEST":"",$.alphaHash?"#define USE_ALPHAHASH":"",$.sheen?"#define USE_SHEEN":"",$.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",$.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",$.transmission?"#define USE_TRANSMISSION":"",$.transmissionMap?"#define USE_TRANSMISSIONMAP":"",$.thicknessMap?"#define USE_THICKNESSMAP":"",$.vertexTangents&&$.flatShading===!1?"#define USE_TANGENT":"",$.vertexColors||$.instancingColor?"#define USE_COLOR":"",$.vertexAlphas||$.batchingColor?"#define USE_COLOR_ALPHA":"",$.vertexUv1s?"#define USE_UV1":"",$.vertexUv2s?"#define USE_UV2":"",$.vertexUv3s?"#define USE_UV3":"",$.pointsUvs?"#define USE_POINTS_UV":"",$.gradientMap?"#define USE_GRADIENTMAP":"",$.flatShading?"#define FLAT_SHADED":"",$.doubleSided?"#define DOUBLE_SIDED":"",$.flipSided?"#define FLIP_SIDED":"",$.shadowMapEnabled?"#define USE_SHADOWMAP":"",$.shadowMapEnabled?"#define "+X:"",$.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",$.numLightProbes>0?"#define USE_LIGHT_PROBES":"",$.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",$.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",$.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",$.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",$.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",$.toneMapping!==H9?"#define TONE_MAPPING":"",$.toneMapping!==H9?v0.tonemapping_pars_fragment:"",$.toneMapping!==H9?bG("toneMapping",$.toneMapping):"",$.dithering?"#define DITHERING":"",$.opaque?"#define OPAQUE":"",v0.colorspace_pars_fragment,vG("linearToOutputTexel",$.outputColorSpace),xG(),$.useDepthPacking?"#define DEPTH_PACKING "+$.depthPacking:"",`
`].filter(D7).join(`
`);if(H=I$(H),H=gK(H,$),H=pK(H,$),Y=I$(Y),Y=gK(Y,$),Y=pK(Y,$),H=mK(H),Y=mK(Y),$.isRawShaderMaterial!==!0)A=`#version 300 es
`,F=[D,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+F,E=["#define varying in",$.glslVersion===gQ?"":"layout(location = 0) out highp vec4 pc_fragColor;",$.glslVersion===gQ?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+E;let _=A+F+H,V=A+E+Y,z=hK(K,K.VERTEX_SHADER,_),C=hK(K,K.FRAGMENT_SHADER,V);if(K.attachShader(I,z),K.attachShader(I,C),$.index0AttributeName!==void 0)K.bindAttribLocation(I,0,$.index0AttributeName);else if($.hasPositionAttribute===!0)K.bindAttribLocation(I,0,"position");K.linkProgram(I);function P(v){if(J.debug.checkShaderErrors){let h=K.getProgramInfoLog(I)||"",r=K.getShaderInfoLog(z)||"",j=K.getShaderInfoLog(C)||"",d=h.trim(),o=r.trim(),m=j.trim(),Q0=!0,c=!0;if(K.getProgramParameter(I,K.LINK_STATUS)===!1)if(Q0=!1,typeof J.debug.onShaderError==="function")J.debug.onShaderError(K,I,z,C);else{let a=xK(K,z,"vertex"),J0=xK(K,C,"fragment");S0("WebGLProgram: Shader Error "+K.getError()+" - VALIDATE_STATUS "+K.getProgramParameter(I,K.VALIDATE_STATUS)+`

Material Name: `+v.name+`
Material Type: `+v.type+`

Program Info Log: `+d+`
`+a+`
`+J0)}else if(d!=="")P0("WebGLProgram: Program Info Log:",d);else if(o===""||m==="")c=!1;if(c)v.diagnostics={runnable:Q0,programLog:d,vertexShader:{log:o,prefix:F},fragmentShader:{log:m,prefix:E}}}K.deleteShader(z),K.deleteShader(C),L=new O7(K,I),B=mG(K,I)}let L;this.getUniforms=function(){if(L===void 0)P(this);return L};let B;this.getAttributes=function(){if(B===void 0)P(this);return B};let l=$.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){if(l===!1)l=K.getProgramParameter(I,SG);return l},this.destroy=function(){Z.releaseStatesOfProgram(this),K.deleteProgram(I),this.program=void 0},this.type=$.shaderType,this.name=$.shaderName,this.id=jG++,this.cacheKey=Q,this.usedTimes=1,this.program=I,this.vertexShader=z,this.fragmentShader=C,this}var ZN=0;class $W{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(J,Q,$){let Z=this._getShaderCacheForMaterial(J);if(Z.has(Q)===!1)Z.add(Q),Q.usedTimes++;if(Z.has($)===!1)Z.add($),$.usedTimes++;return this}remove(J){let Q=this.materialCache.get(J);for(let $ of Q)if($.usedTimes--,$.usedTimes===0)this.shaderCache.delete($.code);return this.materialCache.delete(J),this}getVertexShaderStage(J){return this._getShaderStage(J.vertexShader)}getFragmentShaderStage(J){return this._getShaderStage(J.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(J){let Q=this.materialCache,$=Q.get(J);if($===void 0)$=new Set,Q.set(J,$);return $}_getShaderStage(J){let Q=this.shaderCache,$=Q.get(J);if($===void 0)$=new ZW(J),Q.set(J,$);return $}}class ZW{constructor(J){this.id=ZN++,this.code=J,this.usedTimes=0}}function KN(J){return J===J8||J===o7||J===a7}function WN(J,Q,$,Z,K,W){let H=new X7,Y=new $W,X=new Set,U=[],N=new Map,q=Z.logarithmicDepthBuffer,G=Z.precision,D={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function M(L){if(X.add(L),L===0)return"uv";return`uv${L}`}function I(L,B,l,v,h,r){let j=v.fog,d=h.geometry,o=L.isMeshStandardMaterial||L.isMeshLambertMaterial||L.isMeshPhongMaterial?v.environment:null,m=L.isMeshStandardMaterial||L.isMeshLambertMaterial&&!L.envMap||L.isMeshPhongMaterial&&!L.envMap,Q0=Q.get(L.envMap||o,m),c=!!Q0&&Q0.mapping===K7?Q0.image.height:null,a=D[L.type];if(L.precision!==null){if(G=Z.getMaxPrecision(L.precision),G!==L.precision)P0("WebGLProgram.getParameters:",L.precision,"not supported, using",G,"instead.")}let J0=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,_0=J0!==void 0?J0.length:0,z0=0;if(d.morphAttributes.position!==void 0)z0=1;if(d.morphAttributes.normal!==void 0)z0=2;if(d.morphAttributes.color!==void 0)z0=3;let QJ,h0,n,$0;if(a){let $J=M9[a];QJ=$J.vertexShader,h0=$J.fragmentShader}else{QJ=L.vertexShader,h0=L.fragmentShader;let $J=Y.getVertexShaderStage(L),s0=Y.getFragmentShaderStage(L);Y.update(L,$J,s0),n=$J.id,$0=s0.id}let K0=J.getRenderTarget(),A0=J.state.buffers.depth.getReversed(),T0=h.isInstancedMesh===!0,B0=h.isBatchedMesh===!0,FJ=!!L.map,p0=!!L.matcap,l0=!!Q0,o0=!!L.aoMap,d0=!!L.lightMap,BJ=!!L.bumpMap&&L.wireframe===!1,HJ=!!L.normalMap,vJ=!!L.displacementMap,DJ=!!L.emissiveMap,OJ=!!L.metalnessMap,T=!!L.roughnessMap,hJ=L.anisotropy>0,n0=L.clearcoat>0,XJ=L.dispersion>0,k=L.retroreflectivity>0,O=L.iridescence>0,w=L.sheen>0,g=L.transmission>0,e=hJ&&!!L.anisotropyMap,W0=n0&&!!L.clearcoatMap,X0=n0&&!!L.clearcoatNormalMap,u=n0&&!!L.clearcoatRoughnessMap,i=O&&!!L.iridescenceMap,F0=O&&!!L.iridescenceThicknessMap,V0=w&&!!L.sheenColorMap,U0=w&&!!L.sheenRoughnessMap,Z0=!!L.specularMap,I0=!!L.specularColorMap,C0=!!L.specularIntensityMap,c0=g&&!!L.transmissionMap,y=g&&!!L.thicknessMap,H0=!!L.gradientMap,s=!!L.alphaMap,Y0=L.alphaTest>0,D0=!!L.alphaHash,t=!!L.extensions,N0=H9;if(L.toneMapped){if(K0===null||K0.isXRRenderTarget===!0)N0=J.toneMapping}let y0={shaderID:a,shaderType:L.type,shaderName:L.name,vertexShader:QJ,fragmentShader:h0,defines:L.defines,customVertexShaderID:n,customFragmentShaderID:$0,isRawShaderMaterial:L.isRawShaderMaterial===!0,glslVersion:L.glslVersion,precision:G,batching:B0,batchingColor:B0&&h._colorsTexture!==null,instancing:T0,instancingColor:T0&&h.instanceColor!==null,instancingMorph:T0&&h.morphTexture!==null,outputColorSpace:K0===null?J.outputColorSpace:K0.isXRRenderTarget===!0?K0.texture.colorSpace:m0.workingColorSpace,alphaToCoverage:!!L.alphaToCoverage,map:FJ,matcap:p0,envMap:l0,envMapMode:l0&&Q0.mapping,envMapCubeUVHeight:c,aoMap:o0,lightMap:d0,bumpMap:BJ,normalMap:HJ,displacementMap:vJ,emissiveMap:DJ,normalMapObjectSpace:HJ&&L.normalMapType===UK,normalMapTangentSpace:HJ&&L.normalMapType===hQ,packedNormalMap:HJ&&L.normalMapType===hQ&&KN(L.normalMap.format),metalnessMap:OJ,roughnessMap:T,anisotropy:hJ,anisotropyMap:e,clearcoat:n0,clearcoatMap:W0,clearcoatNormalMap:X0,clearcoatRoughnessMap:u,dispersion:XJ,retroreflection:k,iridescence:O,iridescenceMap:i,iridescenceThicknessMap:F0,sheen:w,sheenColorMap:V0,sheenRoughnessMap:U0,specularMap:Z0,specularColorMap:I0,specularIntensityMap:C0,transmission:g,transmissionMap:c0,thicknessMap:y,gradientMap:H0,opaque:L.transparent===!1&&L.blending===Z7&&L.alphaToCoverage===!1,alphaMap:s,alphaTest:Y0,alphaHash:D0,combine:L.combine,mapUv:FJ&&M(L.map.channel),aoMapUv:o0&&M(L.aoMap.channel),lightMapUv:d0&&M(L.lightMap.channel),bumpMapUv:BJ&&M(L.bumpMap.channel),normalMapUv:HJ&&M(L.normalMap.channel),displacementMapUv:vJ&&M(L.displacementMap.channel),emissiveMapUv:DJ&&M(L.emissiveMap.channel),metalnessMapUv:OJ&&M(L.metalnessMap.channel),roughnessMapUv:T&&M(L.roughnessMap.channel),anisotropyMapUv:e&&M(L.anisotropyMap.channel),clearcoatMapUv:W0&&M(L.clearcoatMap.channel),clearcoatNormalMapUv:X0&&M(L.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:u&&M(L.clearcoatRoughnessMap.channel),iridescenceMapUv:i&&M(L.iridescenceMap.channel),iridescenceThicknessMapUv:F0&&M(L.iridescenceThicknessMap.channel),sheenColorMapUv:V0&&M(L.sheenColorMap.channel),sheenRoughnessMapUv:U0&&M(L.sheenRoughnessMap.channel),specularMapUv:Z0&&M(L.specularMap.channel),specularColorMapUv:I0&&M(L.specularColorMap.channel),specularIntensityMapUv:C0&&M(L.specularIntensityMap.channel),transmissionMapUv:c0&&M(L.transmissionMap.channel),thicknessMapUv:y&&M(L.thicknessMap.channel),alphaMapUv:s&&M(L.alphaMap.channel),vertexTangents:!!d.attributes.tangent&&(HJ||hJ),vertexNormals:!!d.attributes.normal,vertexColors:L.vertexColors,vertexAlphas:L.vertexColors===!0&&!!d.attributes.color&&d.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!d.attributes.uv&&(FJ||s),fog:!!j,useFog:L.fog===!0,fogExp2:!!j&&j.isFogExp2,flatShading:L.wireframe===!1&&(L.flatShading===!0||d.attributes.normal===void 0&&HJ===!1&&(L.isMeshLambertMaterial||L.isMeshPhongMaterial||L.isMeshStandardMaterial||L.isMeshPhysicalMaterial)),sizeAttenuation:L.sizeAttenuation===!0,logarithmicDepthBuffer:q,reversedDepthBuffer:A0,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:d.attributes.position!==void 0,morphTargets:d.morphAttributes.position!==void 0,morphNormals:d.morphAttributes.normal!==void 0,morphColors:d.morphAttributes.color!==void 0,morphTargetsCount:_0,morphTextureStride:z0,numSunLights:B.sun.length,numDirLights:B.directional.length,numPointLights:B.point.length,numSpotLights:B.spot.length,numSpotLightMaps:B.spotLightMap.length,numRectAreaLights:B.rectArea.length,numHemiLights:B.hemi.length,numSunLightShadows:B.sunShadowMap.length,numDirLightShadows:B.directionalShadowMap.length,numPointLightShadows:B.pointShadowMap.length,numSpotLightShadows:B.spotShadowMap.length,numSpotLightShadowsWithMaps:B.numSpotLightShadowsWithMaps,numLightProbes:B.numLightProbes,numLightProbeGrids:r.length,numClippingPlanes:W.numPlanes,numClipIntersection:W.numIntersection,dithering:L.dithering,shadowMapEnabled:J.shadowMap.enabled&&l.length>0,shadowMapType:J.shadowMap.type,toneMapping:N0,decodeVideoTexture:FJ&&L.map.isVideoTexture===!0&&m0.getTransfer(L.map.colorSpace)===JJ,decodeVideoTextureEmissive:DJ&&L.emissiveMap.isVideoTexture===!0&&m0.getTransfer(L.emissiveMap.colorSpace)===JJ,premultipliedAlpha:L.premultipliedAlpha,doubleSided:L.side===rJ,flipSided:L.side===bJ,useDepthPacking:L.depthPacking>=0,depthPacking:L.depthPacking||0,index0AttributeName:L.index0AttributeName,extensionClipCullDistance:t&&L.extensions.clipCullDistance===!0&&$.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(t&&L.extensions.multiDraw===!0||B0)&&$.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:$.has("KHR_parallel_shader_compile"),customProgramCacheKey:L.customProgramCacheKey()};return y0.vertexUv1s=X.has(1),y0.vertexUv2s=X.has(2),y0.vertexUv3s=X.has(3),X.clear(),y0}function F(L){let B=[];if(L.shaderID)B.push(L.shaderID);else B.push(L.customVertexShaderID),B.push(L.customFragmentShaderID);if(L.defines!==void 0)for(let l in L.defines)B.push(l),B.push(L.defines[l]);if(L.isRawShaderMaterial===!1)E(B,L),A(B,L),B.push(J.outputColorSpace);return B.push(L.customProgramCacheKey),B.join()}function E(L,B){L.push(B.precision),L.push(B.outputColorSpace),L.push(B.envMapMode),L.push(B.envMapCubeUVHeight),L.push(B.mapUv),L.push(B.alphaMapUv),L.push(B.lightMapUv),L.push(B.aoMapUv),L.push(B.bumpMapUv),L.push(B.normalMapUv),L.push(B.displacementMapUv),L.push(B.emissiveMapUv),L.push(B.metalnessMapUv),L.push(B.roughnessMapUv),L.push(B.anisotropyMapUv),L.push(B.clearcoatMapUv),L.push(B.clearcoatNormalMapUv),L.push(B.clearcoatRoughnessMapUv),L.push(B.iridescenceMapUv),L.push(B.iridescenceThicknessMapUv),L.push(B.sheenColorMapUv),L.push(B.sheenRoughnessMapUv),L.push(B.specularMapUv),L.push(B.specularColorMapUv),L.push(B.specularIntensityMapUv),L.push(B.transmissionMapUv),L.push(B.thicknessMapUv),L.push(B.combine),L.push(B.fogExp2),L.push(B.sizeAttenuation),L.push(B.morphTargetsCount),L.push(B.morphAttributeCount),L.push(B.numSunLights),L.push(B.numDirLights),L.push(B.numPointLights),L.push(B.numSpotLights),L.push(B.numSpotLightMaps),L.push(B.numHemiLights),L.push(B.numRectAreaLights),L.push(B.numSunLightShadows),L.push(B.numDirLightShadows),L.push(B.numPointLightShadows),L.push(B.numSpotLightShadows),L.push(B.numSpotLightShadowsWithMaps),L.push(B.numLightProbes),L.push(B.shadowMapType),L.push(B.toneMapping),L.push(B.numClippingPlanes),L.push(B.numClipIntersection),L.push(B.depthPacking)}function A(L,B){if(H.disableAll(),B.instancing)H.enable(0);if(B.instancingColor)H.enable(1);if(B.instancingMorph)H.enable(2);if(B.matcap)H.enable(3);if(B.envMap)H.enable(4);if(B.normalMapObjectSpace)H.enable(5);if(B.normalMapTangentSpace)H.enable(6);if(B.clearcoat)H.enable(7);if(B.iridescence)H.enable(8);if(B.alphaTest)H.enable(9);if(B.vertexColors)H.enable(10);if(B.vertexAlphas)H.enable(11);if(B.vertexUv1s)H.enable(12);if(B.vertexUv2s)H.enable(13);if(B.vertexUv3s)H.enable(14);if(B.vertexTangents)H.enable(15);if(B.anisotropy)H.enable(16);if(B.alphaHash)H.enable(17);if(B.batching)H.enable(18);if(B.dispersion)H.enable(19);if(B.retroreflection)H.enable(24);if(B.batchingColor)H.enable(20);if(B.gradientMap)H.enable(21);if(B.packedNormalMap)H.enable(22);if(B.vertexNormals)H.enable(23);if(L.push(H.mask),H.disableAll(),B.fog)H.enable(0);if(B.useFog)H.enable(1);if(B.flatShading)H.enable(2);if(B.logarithmicDepthBuffer)H.enable(3);if(B.reversedDepthBuffer)H.enable(4);if(B.skinning)H.enable(5);if(B.morphTargets)H.enable(6);if(B.morphNormals)H.enable(7);if(B.morphColors)H.enable(8);if(B.premultipliedAlpha)H.enable(9);if(B.shadowMapEnabled)H.enable(10);if(B.doubleSided)H.enable(11);if(B.flipSided)H.enable(12);if(B.useDepthPacking)H.enable(13);if(B.dithering)H.enable(14);if(B.transmission)H.enable(15);if(B.sheen)H.enable(16);if(B.opaque)H.enable(17);if(B.pointsUvs)H.enable(18);if(B.decodeVideoTexture)H.enable(19);if(B.decodeVideoTextureEmissive)H.enable(20);if(B.alphaToCoverage)H.enable(21);if(B.numLightProbeGrids>0)H.enable(22);if(B.hasPositionAttribute)H.enable(23);L.push(H.mask)}function _(L){let B=D[L.type],l;if(B){let v=M9[B];l=BK.clone(v.uniforms)}else l=L.uniforms;return l}function V(L,B){let l=N.get(B);if(l!==void 0)++l.usedTimes;else l=new $N(J,B,L,K),U.push(l),N.set(B,l);return l}function z(L){if(--L.usedTimes===0){let B=U.indexOf(L);U[B]=U[U.length-1],U.pop(),N.delete(L.cacheKey),L.destroy()}}function C(L){Y.remove(L)}function P(){Y.dispose()}return{getParameters:I,getProgramCacheKey:F,getUniforms:_,acquireProgram:V,releaseProgram:z,releaseShaderCache:C,programs:U,dispose:P}}function HN(){let J=new WeakMap;function Q(H){return J.has(H)}function $(H){let Y=J.get(H);if(Y===void 0)Y={},J.set(H,Y);return Y}function Z(H){J.delete(H)}function K(H,Y,X){J.get(H)[Y]=X}function W(){J=new WeakMap}return{has:Q,get:$,remove:Z,update:K,dispose:W}}function YN(J,Q){if(J.groupOrder!==Q.groupOrder)return J.groupOrder-Q.groupOrder;else if(J.renderOrder!==Q.renderOrder)return J.renderOrder-Q.renderOrder;else if(J.material.id!==Q.material.id)return J.material.id-Q.material.id;else if(J.materialVariant!==Q.materialVariant)return J.materialVariant-Q.materialVariant;else if(J.z!==Q.z)return J.z-Q.z;else return J.id-Q.id}function dK(J,Q){if(J.groupOrder!==Q.groupOrder)return J.groupOrder-Q.groupOrder;else if(J.renderOrder!==Q.renderOrder)return J.renderOrder-Q.renderOrder;else if(J.z!==Q.z)return Q.z-J.z;else return J.id-Q.id}function uK(){let J=[],Q=0,$=[],Z=[],K=[];function W(){Q=0,$.length=0,Z.length=0,K.length=0}function H(G){let D=0;if(G.isInstancedMesh)D+=2;if(G.isSkinnedMesh)D+=1;return D}function Y(G,D,M,I,F,E){let A=J[Q];if(A===void 0)A={id:G.id,object:G,geometry:D,material:M,materialVariant:H(G),groupOrder:I,renderOrder:G.renderOrder,z:F,group:E},J[Q]=A;else A.id=G.id,A.object=G,A.geometry=D,A.material=M,A.materialVariant=H(G),A.groupOrder=I,A.renderOrder=G.renderOrder,A.z=F,A.group=E;return Q++,A}function X(G,D,M,I,F,E,A){if(A.reversedDepth===!0)F=-F;let _=Y(G,D,M,I,F,E);if(M.transmission>0)Z.push(_);else if(M.transparent===!0)K.push(_);else $.push(_)}function U(G,D,M,I,F,E){let A=Y(G,D,M,I,F,E);if(M.transmission>0)Z.unshift(A);else if(M.transparent===!0)K.unshift(A);else $.unshift(A)}function N(G,D){if($.length>1)$.sort(G||YN);if(Z.length>1)Z.sort(D||dK);if(K.length>1)K.sort(D||dK)}function q(){for(let G=Q,D=J.length;G<D;G++){let M=J[G];if(M.id===null)break;M.id=null,M.object=null,M.geometry=null,M.material=null,M.group=null}}return{opaque:$,transmissive:Z,transparent:K,init:W,push:X,unshift:U,finish:q,sort:N}}function XN(){let J=new WeakMap;function Q(Z,K){let W=J.get(Z),H;if(W===void 0)H=new uK,J.set(Z,[H]);else if(K>=W.length)H=new uK,W.push(H);else H=W[K];return H}function $(){J=new WeakMap}return{get:Q,dispose:$}}function UN(){let J={};return{get:function(Q){if(J[Q.id]!==void 0)return J[Q.id];let $;switch(Q.type){case"SunLight":case"DirectionalLight":$={direction:new f,color:new g0};break;case"SpotLight":$={position:new f,direction:new f,color:new g0,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":$={position:new f,color:new g0,distance:0,decay:0};break;case"HemisphereLight":$={direction:new f,skyColor:new g0,groundColor:new g0};break;case"RectAreaLight":$={color:new g0,position:new f,halfWidth:new f,halfHeight:new f};break}return J[Q.id]=$,$}}}function GN(){let J={};return{get:function(Q){if(J[Q.id]!==void 0)return J[Q.id];let $;switch(Q.type){case"SunLight":case"DirectionalLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new w0};break;case"SpotLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new w0};break;case"PointLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new w0,shadowCameraNear:1,shadowCameraFar:1000};break}return J[Q.id]=$,$}}}var NN=0;function qN(J,Q){return(Q.castShadow?2:0)-(J.castShadow?2:0)+(Q.map?1:0)-(J.map?1:0)}function EN(J){let Q=new UN,$=GN(),Z={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let U=0;U<9;U++)Z.probe.push(new f);let K=new f,W=new KJ,H=new KJ;function Y(U){let N=0,q=0,G=0;for(let h=0;h<9;h++)Z.probe[h].set(0,0,0);let D=0,M=0,I=0,F=0,E=0,A=0,_=0,V=0,z=0,C=0,P=0,L=0,B=0,l=0;U.sort(qN);for(let h=0,r=U.length;h<r;h++){let j=U[h],d=j.color,o=j.intensity,m=j.distance,Q0=null;if(j.shadow&&j.shadow.map)if(j.shadow.map.texture.format===J8)Q0=j.shadow.map.texture;else Q0=j.shadow.map.depthTexture||j.shadow.map.texture;if(j.isAmbientLight)N+=d.r*o,q+=d.g*o,G+=d.b*o;else if(j.isLightProbe){for(let c=0;c<9;c++)Z.probe[c].addScaledVector(j.sh.coefficients[c],o);l++}else if(j.isSunLight){let c=Q.get(j);if(c.color.copy(j.color).multiplyScalar(j.intensity),j.castShadow){let a=j.shadow,J0=$.get(j);J0.shadowIntensity=a.intensity,J0.shadowBias=a.bias,J0.shadowNormalBias=a.normalBias,J0.shadowRadius=a.radius,J0.shadowMapSize.copy(a.mapSize).multiply(a.getFrameExtents()),Z.sunShadow[M]=J0,Z.sunShadowMap[M]=Q0;let _0=a.getViewportCount();for(let z0=0;z0<_0;z0++)Z.sunShadowMatrix[I+z0]=a.getMatrix(z0),Z.sunShadowCascade[I+z0]=a._cascadeData[z0];I+=_0,M++}Z.sun[D]=c,D++}else if(j.isDirectionalLight){let c=Q.get(j);if(c.color.copy(j.color).multiplyScalar(j.intensity),j.castShadow){let a=j.shadow,J0=$.get(j);J0.shadowIntensity=a.intensity,J0.shadowBias=a.bias,J0.shadowNormalBias=a.normalBias,J0.shadowRadius=a.radius,J0.shadowMapSize=a.mapSize,Z.directionalShadow[F]=J0,Z.directionalShadowMap[F]=Q0,Z.directionalShadowMatrix[F]=j.shadow.matrix,z++}Z.directional[F]=c,F++}else if(j.isSpotLight){let c=Q.get(j);c.position.setFromMatrixPosition(j.matrixWorld),c.color.copy(d).multiplyScalar(o),c.distance=m,c.coneCos=Math.cos(j.angle),c.penumbraCos=Math.cos(j.angle*(1-j.penumbra)),c.decay=j.decay,Z.spot[A]=c;let a=j.shadow;if(j.map){if(Z.spotLightMap[L]=j.map,L++,a.updateMatrices(j),j.castShadow)B++}if(Z.spotLightMatrix[A]=a.matrix,j.castShadow){let J0=$.get(j);J0.shadowIntensity=a.intensity,J0.shadowBias=a.bias,J0.shadowNormalBias=a.normalBias,J0.shadowRadius=a.radius,J0.shadowMapSize=a.mapSize,Z.spotShadow[A]=J0,Z.spotShadowMap[A]=Q0,P++}A++}else if(j.isRectAreaLight){let c=Q.get(j);c.color.copy(d).multiplyScalar(o),c.halfWidth.set(j.width*0.5,0,0),c.halfHeight.set(0,j.height*0.5,0),Z.rectArea[_]=c,_++}else if(j.isPointLight){let c=Q.get(j);if(c.color.copy(j.color).multiplyScalar(j.intensity),c.distance=j.distance,c.decay=j.decay,j.castShadow){let a=j.shadow,J0=$.get(j);J0.shadowIntensity=a.intensity,J0.shadowBias=a.bias,J0.shadowNormalBias=a.normalBias,J0.shadowRadius=a.radius,J0.shadowMapSize=a.mapSize,J0.shadowCameraNear=a.camera.near,J0.shadowCameraFar=a.camera.far,Z.pointShadow[E]=J0,Z.pointShadowMap[E]=Q0,Z.pointShadowMatrix[E]=j.shadow.matrix,C++}Z.point[E]=c,E++}else if(j.isHemisphereLight){let c=Q.get(j);c.skyColor.copy(j.color).multiplyScalar(o),c.groundColor.copy(j.groundColor).multiplyScalar(o),Z.hemi[V]=c,V++}}if(_>0)if(J.has("OES_texture_float_linear")===!0)Z.rectAreaLTC1=G0.LTC_FLOAT_1,Z.rectAreaLTC2=G0.LTC_FLOAT_2;else Z.rectAreaLTC1=G0.LTC_HALF_1,Z.rectAreaLTC2=G0.LTC_HALF_2;Z.ambient[0]=N,Z.ambient[1]=q,Z.ambient[2]=G;let v=Z.hash;if(v.sunLength!==D||v.directionalLength!==F||v.pointLength!==E||v.spotLength!==A||v.rectAreaLength!==_||v.hemiLength!==V||v.numSunShadows!==M||v.numDirectionalShadows!==z||v.numPointShadows!==C||v.numSpotShadows!==P||v.numSpotMaps!==L||v.numLightProbes!==l)Z.sun.length=D,Z.directional.length=F,Z.spot.length=A,Z.rectArea.length=_,Z.point.length=E,Z.hemi.length=V,Z.sunShadow.length=M,Z.sunShadowMap.length=M,Z.sunShadowMatrix.length=I,Z.sunShadowCascade.length=I,Z.directionalShadow.length=z,Z.directionalShadowMap.length=z,Z.directionalShadowMatrix.length=z,Z.pointShadow.length=C,Z.pointShadowMap.length=C,Z.pointShadowMatrix.length=C,Z.spotShadow.length=P,Z.spotShadowMap.length=P,Z.spotLightMatrix.length=P+L-B,Z.spotLightMap.length=L,Z.numSpotLightShadowsWithMaps=B,Z.numLightProbes=l,v.sunLength=D,v.directionalLength=F,v.pointLength=E,v.spotLength=A,v.rectAreaLength=_,v.hemiLength=V,v.numSunShadows=M,v.numDirectionalShadows=z,v.numPointShadows=C,v.numSpotShadows=P,v.numSpotMaps=L,v.numLightProbes=l,Z.version=NN++}function X(U,N){let q=0,G=0,D=0,M=0,I=0,F=0,E=N.matrixWorldInverse;for(let A=0,_=U.length;A<_;A++){let V=U[A];if(V.isSunLight){let z=Z.sun[q];z.direction.setFromMatrixPosition(V.matrixWorld),z.direction.transformDirection(E),q++}else if(V.isDirectionalLight){let z=Z.directional[G];z.direction.setFromMatrixPosition(V.matrixWorld),K.setFromMatrixPosition(V.target.matrixWorld),z.direction.sub(K),z.direction.transformDirection(E),G++}else if(V.isSpotLight){let z=Z.spot[M];z.position.setFromMatrixPosition(V.matrixWorld),z.position.applyMatrix4(E),z.direction.setFromMatrixPosition(V.matrixWorld),K.setFromMatrixPosition(V.target.matrixWorld),z.direction.sub(K),z.direction.transformDirection(E),M++}else if(V.isRectAreaLight){let z=Z.rectArea[I];z.position.setFromMatrixPosition(V.matrixWorld),z.position.applyMatrix4(E),H.identity(),W.copy(V.matrixWorld),W.premultiply(E),H.extractRotation(W),z.halfWidth.set(V.width*0.5,0,0),z.halfHeight.set(0,V.height*0.5,0),z.halfWidth.applyMatrix4(H),z.halfHeight.applyMatrix4(H),I++}else if(V.isPointLight){let z=Z.point[D];z.position.setFromMatrixPosition(V.matrixWorld),z.position.applyMatrix4(E),D++}else if(V.isHemisphereLight){let z=Z.hemi[F];z.direction.setFromMatrixPosition(V.matrixWorld),z.direction.transformDirection(E),F++}}}return{setup:Y,setupView:X,state:Z}}function cK(J){let Q=new EN(J),$=[],Z=[],K=[];function W(G){q.camera=G,$.length=0,Z.length=0,K.length=0}function H(G){$.push(G)}function Y(G){Z.push(G)}function X(G){K.push(G)}function U(){Q.setup($)}function N(G){Q.setupView($,G)}let q={lightsArray:$,shadowsArray:Z,lightProbeGridArray:K,camera:null,lights:Q,transmissionRenderTarget:{},textureUnits:0};return{init:W,state:q,setupLights:U,setupLightsView:N,pushLight:H,pushShadow:Y,pushLightProbeGrid:X}}function FN(J){let Q=new WeakMap;function $(K,W=0){let H=Q.get(K),Y;if(H===void 0)Y=new cK(J),Q.set(K,[Y]);else if(W>=H.length)Y=new cK(J),H.push(Y);else Y=H[W];return Y}function Z(){Q=new WeakMap}return{get:$,dispose:Z}}var DN=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,ON=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,RN=[new f(1,0,0),new f(-1,0,0),new f(0,1,0),new f(0,-1,0),new f(0,0,1),new f(0,0,-1)],MN=[new f(0,-1,0),new f(0,-1,0),new f(0,0,1),new f(0,0,-1),new f(0,-1,0),new f(0,-1,0)],nK=new KJ,F7=new f,k$=new f;function LN(J,Q,$){let Z=new Z6,K=new w0,W=new w0,H=new UJ,Y=new rQ,X=new tQ,U={},N=$.maxTextureSize,q={[f8]:bJ,[bJ]:f8,[rJ]:rJ},G=new SJ({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new w0},radius:{value:4}},vertexShader:DN,fragmentShader:ON}),D=G.clone();D.defines.HORIZONTAL_PASS=1;let M=new gJ;M.setAttribute("position",new K9(new Float32Array([-1,-1,0.5,3,-1,0.5,-1,3,0.5]),3));let I=new zJ(M,G),F=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=$7;let E=this.type;this.render=function(C,P,L){if(F.enabled===!1)return;if(F.autoUpdate===!1&&F.needsUpdate===!1)return;if(C.length===0)return;if(this.type===BZ)P0("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=$7;let B=J.getRenderTarget(),l=J.getActiveCubeFace(),v=J.getActiveMipmapLevel(),h=J.state;if(h.setBlending(E9),h.buffers.depth.getReversed()===!0)h.buffers.color.setClear(0,0,0,0);else h.buffers.color.setClear(1,1,1,1);h.buffers.depth.setTest(!0),h.setScissorTest(!1);let r=E!==this.type;if(r)P.traverse(function(j){if(j.material)if(Array.isArray(j.material))j.material.forEach((d)=>d.needsUpdate=!0);else j.material.needsUpdate=!0});for(let j=0,d=C.length;j<d;j++){let o=C[j],m=o.shadow;if(m===void 0){P0("WebGLShadowMap:",o,"has no shadow.");continue}if(m.autoUpdate===!1&&m.needsUpdate===!1)continue;K.copy(m.mapSize);let Q0=m.getFrameExtents();if(K.multiply(Q0),W.copy(m.mapSize),K.x>N||K.y>N){if(K.x>N)W.x=Math.floor(N/Q0.x),K.x=W.x*Q0.x,m.mapSize.x=W.x;if(K.y>N)W.y=Math.floor(N/Q0.y),K.y=W.y*Q0.y,m.mapSize.y=W.y}let c=J.state.buffers.depth.getReversed();if(m.camera._reversedDepth=c,m.map===null||r===!0){if(m.map!==null){if(m.map.depthTexture!==null)m.map.depthTexture.dispose(),m.map.depthTexture=null;m.map.dispose()}if(this.type===y8){if(o.isPointLight){P0("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}m.map=new cJ(K.x,K.y,{format:J8,type:F9,minFilter:xJ,magFilter:xJ,generateMipmaps:!1}),m.map.texture.name=o.name+".shadowMap",m.map.depthTexture=new Z8(K.x,K.y,P9),m.map.depthTexture.name=o.name+".shadowMapDepth",m.map.depthTexture.format=t9,m.map.depthTexture.compareFunction=null,m.map.depthTexture.minFilter=p9,m.map.depthTexture.magFilter=p9}else{if(o.isPointLight)m.map=new z$(K.x),m.map.depthTexture=new iQ(K.x,m9);else m.map=new cJ(K.x,K.y),m.map.depthTexture=new Z8(K.x,K.y,m9);if(m.map.depthTexture.name=o.name+".shadowMap",m.map.depthTexture.format=t9,this.type===$7)m.map.depthTexture.compareFunction=c?t7:r7,m.map.depthTexture.minFilter=xJ,m.map.depthTexture.magFilter=xJ;else m.map.depthTexture.compareFunction=null,m.map.depthTexture.minFilter=p9,m.map.depthTexture.magFilter=p9}m.camera.updateProjectionMatrix()}if(m.map.isWebGLCubeRenderTarget!==!0&&(m.map.width!==K.x||m.map.height!==K.y))m.map.setSize(K.x,K.y);let a=m.map.isWebGLCubeRenderTarget?6:m.getViewportCount();if(o.isPointLight!==!0)m.updateMatrices(o,L);for(let J0=0;J0<a;J0++){let _0=m.getCamera(J0);if(o.isPointLight){let{camera:z0,matrix:QJ}=m,h0=o.distance||z0.far;if(h0!==z0.far)z0.far=h0,z0.updateProjectionMatrix();F7.setFromMatrixPosition(o.matrixWorld),z0.position.copy(F7),k$.copy(z0.position),k$.add(RN[J0]),z0.up.copy(MN[J0]),z0.lookAt(k$),z0.updateMatrixWorld(),QJ.makeTranslation(-F7.x,-F7.y,-F7.z),nK.multiplyMatrices(z0.projectionMatrix,z0.matrixWorldInverse),m._frustum.setFromProjectionMatrix(nK,z0.coordinateSystem,z0.reversedDepth)}if(m.map.isWebGLCubeRenderTarget)J.setRenderTarget(m.map,J0),J.clear();else{if(J0===0)J.setRenderTarget(m.map),J.clear();let z0=m.getViewport(J0);H.set(W.x*z0.x,W.y*z0.y,W.x*z0.z,W.y*z0.w),h.viewport(H)}Z=m.getFrustum(J0),V(P,L,_0,o,this.type)}if(m.isPointLightShadow!==!0&&this.type===y8)A(m,L);m.needsUpdate=!1}E=this.type,F.needsUpdate=!1,J.setRenderTarget(B,l,v)};function A(C,P){let L=Q.update(I);if(G.defines.VSM_SAMPLES!==C.blurSamples)G.defines.VSM_SAMPLES=C.blurSamples,D.defines.VSM_SAMPLES=C.blurSamples,G.needsUpdate=!0,D.needsUpdate=!0;if(C.mapPass===null)C.mapPass=new cJ(K.x,K.y,{format:J8,type:F9});else if(C.mapPass.width!==C.map.width||C.mapPass.height!==C.map.height)C.mapPass.setSize(C.map.width,C.map.height);G.uniforms.shadow_pass.value=C.map.depthTexture,G.uniforms.resolution.value.set(C.map.width,C.map.height),G.uniforms.radius.value=C.radius,J.setRenderTarget(C.mapPass),J.clear(),J.renderBufferDirect(P,null,L,G,I,null),D.uniforms.shadow_pass.value=C.mapPass.texture,D.uniforms.resolution.value.set(C.map.width,C.map.height),D.uniforms.radius.value=C.radius,J.setRenderTarget(C.map),J.clear(),J.renderBufferDirect(P,null,L,D,I,null)}function _(C,P,L,B){let l=null,v=L.isPointLight===!0?C.customDistanceMaterial:C.customDepthMaterial;if(v!==void 0)l=v;else if(l=L.isPointLight===!0?X:Y,J.localClippingEnabled&&P.clipShadows===!0&&Array.isArray(P.clippingPlanes)&&P.clippingPlanes.length!==0||P.displacementMap&&P.displacementScale!==0||P.alphaMap&&P.alphaTest>0||P.map&&P.alphaTest>0||P.alphaToCoverage===!0){let h=l.uuid,r=P.uuid,j=U[h];if(j===void 0)j={},U[h]=j;let d=j[r];if(d===void 0)d=l.clone(),j[r]=d,P.addEventListener("dispose",z);l=d}if(l.visible=P.visible,l.wireframe=P.wireframe,B===y8)l.side=P.shadowSide!==null?P.shadowSide:P.side;else l.side=P.shadowSide!==null?P.shadowSide:q[P.side];if(l.alphaMap=P.alphaMap,l.alphaTest=P.alphaToCoverage===!0?0.5:P.alphaTest,l.map=P.map,l.clipShadows=P.clipShadows,l.clippingPlanes=P.clippingPlanes,l.clipIntersection=P.clipIntersection,l.displacementMap=P.displacementMap,l.displacementScale=P.displacementScale,l.displacementBias=P.displacementBias,l.wireframeLinewidth=P.wireframeLinewidth,l.linewidth=P.linewidth,L.isPointLight===!0&&l.isMeshDistanceMaterial===!0){let h=J.properties.get(l);h.light=L}return l}function V(C,P,L,B,l){if(C.visible===!1)return;if(C.layers.test(P.layers)&&(C.isMesh||C.isLine||C.isPoints)){if((C.castShadow||C.receiveShadow&&l===y8)&&(!C.frustumCulled||C.intersectsFrustum(Z))){C.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,C.matrixWorld);let r=Q.update(C),j=C.material;if(Array.isArray(j)){let d=r.groups;for(let o=0,m=d.length;o<m;o++){let Q0=d[o],c=j[Q0.materialIndex];if(c&&c.visible){let a=_(C,c,B,l);C.onBeforeShadow(J,C,P,L,r,a,Q0),J.renderBufferDirect(L,null,r,a,C,Q0),C.onAfterShadow(J,C,P,L,r,a,Q0)}}}else if(j.visible){let d=_(C,j,B,l);C.onBeforeShadow(J,C,P,L,r,d,null),J.renderBufferDirect(L,null,r,d,C,null),C.onAfterShadow(J,C,P,L,r,d,null)}}}let h=C.children;for(let r=0,j=h.length;r<j;r++)V(h[r],P,L,B,l)}function z(C){C.target.removeEventListener("dispose",z);for(let L in U){let B=U[L],l=C.target.uuid;if(l in B)B[l].dispose(),delete B[l]}}}function kN(J,Q){function $(){let y=!1,H0=new UJ,s=null,Y0=new UJ(0,0,0,0);return{setMask:function(D0){if(s!==D0&&!y)J.colorMask(D0,D0,D0,D0),s=D0},setLocked:function(D0){y=D0},setClear:function(D0,t,N0,y0,$J){if($J===!0)D0*=y0,t*=y0,N0*=y0;if(H0.set(D0,t,N0,y0),Y0.equals(H0)===!1)J.clearColor(D0,t,N0,y0),Y0.copy(H0)},reset:function(){y=!1,s=null,Y0.set(-1,0,0,0)}}}function Z(){let y=!1,H0=!1,s=null,Y0=null,D0=null;return{setReversed:function(t){if(H0!==t){let N0=Q.get("EXT_clip_control");if(t)N0.clipControlEXT(N0.LOWER_LEFT_EXT,N0.ZERO_TO_ONE_EXT);else N0.clipControlEXT(N0.LOWER_LEFT_EXT,N0.NEGATIVE_ONE_TO_ONE_EXT);H0=t;let y0=D0;D0=null,this.setClear(y0)}},getReversed:function(){return H0},setTest:function(t){if(t)K0(J.DEPTH_TEST);else A0(J.DEPTH_TEST)},setMask:function(t){if(s!==t&&!y)J.depthMask(t),s=t},setFunc:function(t){if(H0)t=kK[t];if(Y0!==t){switch(t){case dZ:J.depthFunc(J.NEVER);break;case uZ:J.depthFunc(J.ALWAYS);break;case cZ:J.depthFunc(J.LESS);break;case n6:J.depthFunc(J.LEQUAL);break;case nZ:J.depthFunc(J.EQUAL);break;case sZ:J.depthFunc(J.GEQUAL);break;case iZ:J.depthFunc(J.GREATER);break;case oZ:J.depthFunc(J.NOTEQUAL);break;default:J.depthFunc(J.LEQUAL)}Y0=t}},setLocked:function(t){y=t},setClear:function(t){if(D0!==t){if(D0=t,H0)t=1-t;J.clearDepth(t)}},reset:function(){y=!1,s=null,Y0=null,D0=null,H0=!1}}}function K(){let y=!1,H0=null,s=null,Y0=null,D0=null,t=null,N0=null,y0=null,$J=null;return{setTest:function(s0){if(!y)if(s0)K0(J.STENCIL_TEST);else A0(J.STENCIL_TEST)},setMask:function(s0){if(H0!==s0&&!y)J.stencilMask(s0),H0=s0},setFunc:function(s0,G9,k9){if(s!==s0||Y0!==G9||D0!==k9)J.stencilFunc(s0,G9,k9),s=s0,Y0=G9,D0=k9},setOp:function(s0,G9,k9){if(t!==s0||N0!==G9||y0!==k9)J.stencilOp(s0,G9,k9),t=s0,N0=G9,y0=k9},setLocked:function(s0){y=s0},setClear:function(s0){if($J!==s0)J.clearStencil(s0),$J=s0},reset:function(){y=!1,H0=null,s=null,Y0=null,D0=null,t=null,N0=null,y0=null,$J=null}}}let W=new $,H=new Z,Y=new K,X=new WeakMap,U=new WeakMap,N={},q={},G={},D=new WeakMap,M=[],I=null,F=!1,E=null,A=null,_=null,V=null,z=null,C=null,P=null,L=new g0(0,0,0),B=0,l=!1,v=null,h=null,r=null,j=null,d=null,o=J.getParameter(J.MAX_COMBINED_TEXTURE_IMAGE_UNITS),m=!1,Q0=0,c=J.getParameter(J.VERSION);if(c.indexOf("WebGL")!==-1)Q0=parseFloat(/^WebGL (\d)/.exec(c)[1]),m=Q0>=1;else if(c.indexOf("OpenGL ES")!==-1)Q0=parseFloat(/^OpenGL ES (\d)/.exec(c)[1]),m=Q0>=2;let a=null,J0={},_0=J.getParameter(J.SCISSOR_BOX),z0=J.getParameter(J.VIEWPORT),QJ=new UJ().fromArray(_0),h0=new UJ().fromArray(z0);function n(y,H0,s,Y0){let D0=new Uint8Array(4),t=J.createTexture();J.bindTexture(y,t),J.texParameteri(y,J.TEXTURE_MIN_FILTER,J.NEAREST),J.texParameteri(y,J.TEXTURE_MAG_FILTER,J.NEAREST);for(let N0=0;N0<s;N0++)if(y===J.TEXTURE_3D||y===J.TEXTURE_2D_ARRAY)J.texImage3D(H0,0,J.RGBA,1,1,Y0,0,J.RGBA,J.UNSIGNED_BYTE,D0);else J.texImage2D(H0+N0,0,J.RGBA,1,1,0,J.RGBA,J.UNSIGNED_BYTE,D0);return t}let $0={};$0[J.TEXTURE_2D]=n(J.TEXTURE_2D,J.TEXTURE_2D,1),$0[J.TEXTURE_CUBE_MAP]=n(J.TEXTURE_CUBE_MAP,J.TEXTURE_CUBE_MAP_POSITIVE_X,6),$0[J.TEXTURE_2D_ARRAY]=n(J.TEXTURE_2D_ARRAY,J.TEXTURE_2D_ARRAY,1,1),$0[J.TEXTURE_3D]=n(J.TEXTURE_3D,J.TEXTURE_3D,1,1),W.setClear(0,0,0,1),H.setClear(1),Y.setClear(0),K0(J.DEPTH_TEST),H.setFunc(n6),BJ(!1),HJ(l6),K0(J.CULL_FACE),o0(E9);function K0(y){if(N[y]!==!0)J.enable(y),N[y]=!0}function A0(y){if(N[y]!==!1)J.disable(y),N[y]=!1}function T0(y,H0){if(G[y]!==H0){if(J.bindFramebuffer(y,H0),G[y]=H0,y===J.DRAW_FRAMEBUFFER)G[J.FRAMEBUFFER]=H0;if(y===J.FRAMEBUFFER)G[J.DRAW_FRAMEBUFFER]=H0;return!0}return!1}function B0(y,H0){let s=M,Y0=!1;if(y){if(s=D.get(H0),s===void 0)s=[],D.set(H0,s);let D0=y.textures;if(s.length!==D0.length||s[0]!==J.COLOR_ATTACHMENT0){for(let t=0,N0=D0.length;t<N0;t++)s[t]=J.COLOR_ATTACHMENT0+t;s.length=D0.length,Y0=!0}}else if(s[0]!==J.BACK)s[0]=J.BACK,Y0=!0;if(Y0)J.drawBuffers(s)}function FJ(y){if(I!==y)return J.useProgram(y),I=y,!0;return!1}let p0={[v8]:J.FUNC_ADD,[zZ]:J.FUNC_SUBTRACT,[AZ]:J.FUNC_REVERSE_SUBTRACT};p0[CZ]=J.MIN,p0[PZ]=J.MAX;let l0={[wZ]:J.ZERO,[_Z]:J.ONE,[TZ]:J.SRC_COLOR,[jZ]:J.SRC_ALPHA,[xZ]:J.SRC_ALPHA_SATURATE,[hZ]:J.DST_COLOR,[fZ]:J.DST_ALPHA,[SZ]:J.ONE_MINUS_SRC_COLOR,[yZ]:J.ONE_MINUS_SRC_ALPHA,[bZ]:J.ONE_MINUS_DST_COLOR,[vZ]:J.ONE_MINUS_DST_ALPHA,[gZ]:J.CONSTANT_COLOR,[pZ]:J.ONE_MINUS_CONSTANT_COLOR,[mZ]:J.CONSTANT_ALPHA,[lZ]:J.ONE_MINUS_CONSTANT_ALPHA};function o0(y,H0,s,Y0,D0,t,N0,y0,$J,s0){if(y===E9){if(F===!0)A0(J.BLEND),F=!1;return}if(F===!1)K0(J.BLEND),F=!0;if(y!==IZ){if(y!==E||s0!==l){if(A!==v8||z!==v8)J.blendEquation(J.FUNC_ADD),A=v8,z=v8;if(s0)switch(y){case Z7:J.blendFuncSeparate(J.ONE,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case d6:J.blendFunc(J.ONE,J.ONE);break;case u6:J.blendFuncSeparate(J.ZERO,J.ONE_MINUS_SRC_COLOR,J.ZERO,J.ONE);break;case c6:J.blendFuncSeparate(J.DST_COLOR,J.ONE_MINUS_SRC_ALPHA,J.ZERO,J.ONE);break;default:S0("WebGLState: Invalid blending: ",y);break}else switch(y){case Z7:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case d6:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE,J.ONE,J.ONE);break;case u6:S0("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case c6:S0("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:S0("WebGLState: Invalid blending: ",y);break}_=null,V=null,C=null,P=null,L.set(0,0,0),B=0,E=y,l=s0}return}if(D0=D0||H0,t=t||s,N0=N0||Y0,H0!==A||D0!==z)J.blendEquationSeparate(p0[H0],p0[D0]),A=H0,z=D0;if(s!==_||Y0!==V||t!==C||N0!==P)J.blendFuncSeparate(l0[s],l0[Y0],l0[t],l0[N0]),_=s,V=Y0,C=t,P=N0;if(y0.equals(L)===!1||$J!==B)J.blendColor(y0.r,y0.g,y0.b,$J),L.copy(y0),B=$J;E=y,l=!1}function d0(y,H0){y.side===rJ?A0(J.CULL_FACE):K0(J.CULL_FACE);let s=y.side===bJ;if(H0)s=!s;BJ(s),y.blending===Z7&&y.transparent===!1?o0(E9):o0(y.blending,y.blendEquation,y.blendSrc,y.blendDst,y.blendEquationAlpha,y.blendSrcAlpha,y.blendDstAlpha,y.blendColor,y.blendAlpha,y.premultipliedAlpha),H.setFunc(y.depthFunc),H.setTest(y.depthTest),H.setMask(y.depthWrite),W.setMask(y.colorWrite);let Y0=y.stencilWrite;if(Y.setTest(Y0),Y0)Y.setMask(y.stencilWriteMask),Y.setFunc(y.stencilFunc,y.stencilRef,y.stencilFuncMask),Y.setOp(y.stencilFail,y.stencilZFail,y.stencilZPass);DJ(y.polygonOffset,y.polygonOffsetFactor,y.polygonOffsetUnits),y.alphaToCoverage===!0?K0(J.SAMPLE_ALPHA_TO_COVERAGE):A0(J.SAMPLE_ALPHA_TO_COVERAGE)}function BJ(y){if(v!==y){if(y)J.frontFace(J.CW);else J.frontFace(J.CCW);v=y}}function HJ(y){if(y!==kZ){if(K0(J.CULL_FACE),y!==h)if(y===l6)J.cullFace(J.BACK);else if(y===VZ)J.cullFace(J.FRONT);else J.cullFace(J.FRONT_AND_BACK)}else A0(J.CULL_FACE);h=y}function vJ(y){if(y!==r){if(m)J.lineWidth(y);r=y}}function DJ(y,H0,s){if(y){if(K0(J.POLYGON_OFFSET_FILL),j!==H0||d!==s){if(j=H0,d=s,H.getReversed())H0=-H0;J.polygonOffset(H0,s)}}else A0(J.POLYGON_OFFSET_FILL)}function OJ(y){if(y)K0(J.SCISSOR_TEST);else A0(J.SCISSOR_TEST)}function T(y){if(y===void 0)y=J.TEXTURE0+o-1;if(a!==y)J.activeTexture(y),a=y}function hJ(y,H0,s){if(s===void 0)if(a===null)s=J.TEXTURE0+o-1;else s=a;let Y0=J0[s];if(Y0===void 0)Y0={type:void 0,texture:void 0},J0[s]=Y0;if(Y0.type!==y||Y0.texture!==H0){if(a!==s)J.activeTexture(s),a=s;J.bindTexture(y,H0||$0[y]),Y0.type=y,Y0.texture=H0}}function n0(){let y=J0[a];if(y!==void 0&&y.type!==void 0)J.bindTexture(y.type,null),y.type=void 0,y.texture=void 0}function XJ(){try{J.compressedTexImage2D(...arguments)}catch(y){S0("WebGLState:",y)}}function k(){try{J.compressedTexImage3D(...arguments)}catch(y){S0("WebGLState:",y)}}function O(){try{J.texSubImage2D(...arguments)}catch(y){S0("WebGLState:",y)}}function w(){try{J.texSubImage3D(...arguments)}catch(y){S0("WebGLState:",y)}}function g(){try{J.compressedTexSubImage2D(...arguments)}catch(y){S0("WebGLState:",y)}}function e(){try{J.compressedTexSubImage3D(...arguments)}catch(y){S0("WebGLState:",y)}}function W0(){try{J.texStorage2D(...arguments)}catch(y){S0("WebGLState:",y)}}function X0(){try{J.texStorage3D(...arguments)}catch(y){S0("WebGLState:",y)}}function u(){try{J.texImage2D(...arguments)}catch(y){S0("WebGLState:",y)}}function i(){try{J.texImage3D(...arguments)}catch(y){S0("WebGLState:",y)}}function F0(y){if(q[y]!==void 0)return q[y];else return J.getParameter(y)}function V0(y,H0){if(q[y]!==H0)J.pixelStorei(y,H0),q[y]=H0}function U0(y){if(QJ.equals(y)===!1)J.scissor(y.x,y.y,y.z,y.w),QJ.copy(y)}function Z0(y){if(h0.equals(y)===!1)J.viewport(y.x,y.y,y.z,y.w),h0.copy(y)}function I0(y,H0){let s=U.get(H0);if(s===void 0)s=new WeakMap,U.set(H0,s);let Y0=s.get(y);if(Y0===void 0)Y0=J.getUniformBlockIndex(H0,y.name),s.set(y,Y0)}function C0(y,H0){let Y0=U.get(H0).get(y);if(X.get(H0)!==Y0)J.uniformBlockBinding(H0,Y0,y.__bindingPointIndex),X.set(H0,Y0)}function c0(){J.disable(J.BLEND),J.disable(J.CULL_FACE),J.disable(J.DEPTH_TEST),J.disable(J.POLYGON_OFFSET_FILL),J.disable(J.SCISSOR_TEST),J.disable(J.STENCIL_TEST),J.disable(J.SAMPLE_ALPHA_TO_COVERAGE),J.blendEquation(J.FUNC_ADD),J.blendFunc(J.ONE,J.ZERO),J.blendFuncSeparate(J.ONE,J.ZERO,J.ONE,J.ZERO),J.blendColor(0,0,0,0),J.colorMask(!0,!0,!0,!0),J.clearColor(0,0,0,0),J.depthMask(!0),J.depthFunc(J.LESS),H.setReversed(!1),J.clearDepth(1),J.stencilMask(4294967295),J.stencilFunc(J.ALWAYS,0,4294967295),J.stencilOp(J.KEEP,J.KEEP,J.KEEP),J.clearStencil(0),J.cullFace(J.BACK),J.frontFace(J.CCW),J.polygonOffset(0,0),J.activeTexture(J.TEXTURE0),J.bindFramebuffer(J.FRAMEBUFFER,null),J.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),J.bindFramebuffer(J.READ_FRAMEBUFFER,null),J.useProgram(null),J.lineWidth(1),J.scissor(0,0,J.canvas.width,J.canvas.height),J.viewport(0,0,J.canvas.width,J.canvas.height),J.pixelStorei(J.PACK_ALIGNMENT,4),J.pixelStorei(J.UNPACK_ALIGNMENT,4),J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,!1),J.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),J.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,J.BROWSER_DEFAULT_WEBGL),J.pixelStorei(J.PACK_ROW_LENGTH,0),J.pixelStorei(J.PACK_SKIP_PIXELS,0),J.pixelStorei(J.PACK_SKIP_ROWS,0),J.pixelStorei(J.UNPACK_ROW_LENGTH,0),J.pixelStorei(J.UNPACK_IMAGE_HEIGHT,0),J.pixelStorei(J.UNPACK_SKIP_PIXELS,0),J.pixelStorei(J.UNPACK_SKIP_ROWS,0),J.pixelStorei(J.UNPACK_SKIP_IMAGES,0),N={},q={},a=null,J0={},G={},D=new WeakMap,M=[],I=null,F=!1,E=null,A=null,_=null,V=null,z=null,C=null,P=null,L=new g0(0,0,0),B=0,l=!1,v=null,h=null,r=null,j=null,d=null,QJ.set(0,0,J.canvas.width,J.canvas.height),h0.set(0,0,J.canvas.width,J.canvas.height),W.reset(),H.reset(),Y.reset()}return{buffers:{color:W,depth:H,stencil:Y},enable:K0,disable:A0,bindFramebuffer:T0,drawBuffers:B0,useProgram:FJ,setBlending:o0,setMaterial:d0,setFlipSided:BJ,setCullFace:HJ,setLineWidth:vJ,setPolygonOffset:DJ,setScissorTest:OJ,activeTexture:T,bindTexture:hJ,unbindTexture:n0,compressedTexImage2D:XJ,compressedTexImage3D:k,texImage2D:u,texImage3D:i,pixelStorei:V0,getParameter:F0,updateUBOMapping:I0,uniformBlockBinding:C0,texStorage2D:W0,texStorage3D:X0,texSubImage2D:O,texSubImage3D:w,compressedTexSubImage2D:g,compressedTexSubImage3D:e,scissor:U0,viewport:Z0,reset:c0}}function VN(J,Q,$,Z,K,W,H){let Y=Q.has("WEBGL_multisampled_render_to_texture")?Q.get("WEBGL_multisampled_render_to_texture"):null,X=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),U=new w0,N=new WeakMap,q=new Set,G,D=new WeakMap,M=!1;try{M=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(k){}function I(k,O){return M?new OffscreenCanvas(k,O):Q7("canvas")}function F(k,O,w){let g=1,e=XJ(k);if(e.width>w||e.height>w)g=w/Math.max(e.width,e.height);if(g<1)if(typeof HTMLImageElement<"u"&&k instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&k instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&k instanceof ImageBitmap||typeof VideoFrame<"u"&&k instanceof VideoFrame){let W0=Math.floor(g*e.width),X0=Math.floor(g*e.height);if(G===void 0)G=I(W0,X0);let u=O?I(W0,X0):G;return u.width=W0,u.height=X0,u.getContext("2d").drawImage(k,0,0,W0,X0),P0("WebGLRenderer: Texture has been resized from ("+e.width+"x"+e.height+") to ("+W0+"x"+X0+")."),u}else{if("data"in k)P0("WebGLRenderer: Image in DataTexture is too big ("+e.width+"x"+e.height+").");return k}return k}function E(k){return k.generateMipmaps}function A(k){J.generateMipmap(k)}function _(k){if(k.isWebGLCubeRenderTarget)return J.TEXTURE_CUBE_MAP;if(k.isWebGL3DRenderTarget)return J.TEXTURE_3D;if(k.isWebGLArrayRenderTarget||k.isCompressedArrayTexture)return J.TEXTURE_2D_ARRAY;return J.TEXTURE_2D}function V(k,O,w,g,e,W0=!1){if(k!==null){if(J[k]!==void 0)return J[k];P0("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+k+"'")}let X0;if(g){if(X0=Q.get("EXT_texture_norm16"),!X0)P0("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension")}let u=O;if(O===J.RED){if(w===J.FLOAT)u=J.R32F;if(w===J.HALF_FLOAT)u=J.R16F;if(w===J.UNSIGNED_BYTE)u=J.R8;if(w===J.UNSIGNED_SHORT&&X0)u=X0.R16_EXT;if(w===J.SHORT&&X0)u=X0.R16_SNORM_EXT}if(O===J.RED_INTEGER){if(w===J.UNSIGNED_BYTE)u=J.R8UI;if(w===J.UNSIGNED_SHORT)u=J.R16UI;if(w===J.UNSIGNED_INT)u=J.R32UI;if(w===J.BYTE)u=J.R8I;if(w===J.SHORT)u=J.R16I;if(w===J.INT)u=J.R32I}if(O===J.RG){if(w===J.FLOAT)u=J.RG32F;if(w===J.HALF_FLOAT)u=J.RG16F;if(w===J.UNSIGNED_BYTE)u=J.RG8;if(w===J.UNSIGNED_SHORT&&X0)u=X0.RG16_EXT;if(w===J.SHORT&&X0)u=X0.RG16_SNORM_EXT}if(O===J.RG_INTEGER){if(w===J.UNSIGNED_BYTE)u=J.RG8UI;if(w===J.UNSIGNED_SHORT)u=J.RG16UI;if(w===J.UNSIGNED_INT)u=J.RG32UI;if(w===J.BYTE)u=J.RG8I;if(w===J.SHORT)u=J.RG16I;if(w===J.INT)u=J.RG32I}if(O===J.RGB_INTEGER){if(w===J.UNSIGNED_BYTE)u=J.RGB8UI;if(w===J.UNSIGNED_SHORT)u=J.RGB16UI;if(w===J.UNSIGNED_INT)u=J.RGB32UI;if(w===J.BYTE)u=J.RGB8I;if(w===J.SHORT)u=J.RGB16I;if(w===J.INT)u=J.RGB32I}if(O===J.RGBA_INTEGER){if(w===J.UNSIGNED_BYTE)u=J.RGBA8UI;if(w===J.UNSIGNED_SHORT)u=J.RGBA16UI;if(w===J.UNSIGNED_INT)u=J.RGBA32UI;if(w===J.BYTE)u=J.RGBA8I;if(w===J.SHORT)u=J.RGBA16I;if(w===J.INT)u=J.RGBA32I}if(O===J.RGB){if(w===J.UNSIGNED_SHORT&&X0)u=X0.RGB16_EXT;if(w===J.SHORT&&X0)u=X0.RGB16_SNORM_EXT;if(w===J.UNSIGNED_INT_5_9_9_9_REV)u=J.RGB9_E5;if(w===J.UNSIGNED_INT_10F_11F_11F_REV)u=J.R11F_G11F_B10F}if(O===J.RGBA){let i=W0?xQ:m0.getTransfer(e);if(w===J.FLOAT)u=J.RGBA32F;if(w===J.HALF_FLOAT)u=J.RGBA16F;if(w===J.UNSIGNED_BYTE)u=i===JJ?J.SRGB8_ALPHA8:J.RGBA8;if(w===J.UNSIGNED_SHORT&&X0)u=X0.RGBA16_EXT;if(w===J.SHORT&&X0)u=X0.RGBA16_SNORM_EXT;if(w===J.UNSIGNED_SHORT_4_4_4_4)u=J.RGBA4;if(w===J.UNSIGNED_SHORT_5_5_5_1)u=J.RGB5_A1}if(u===J.R16F||u===J.R32F||u===J.RG16F||u===J.RG32F||u===J.RGBA16F||u===J.RGBA32F)Q.get("EXT_color_buffer_float");return u}function z(k,O){let w;if(k){if(O===null||O===m9||O===b8)w=J.DEPTH24_STENCIL8;else if(O===P9)w=J.DEPTH32F_STENCIL8;else if(O===H7)w=J.DEPTH24_STENCIL8,P0("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")}else if(O===null||O===m9||O===b8)w=J.DEPTH_COMPONENT24;else if(O===P9)w=J.DEPTH_COMPONENT32F;else if(O===H7)w=J.DEPTH_COMPONENT16;return w}function C(k,O){if(E(k)===!0||k.isFramebufferTexture&&k.minFilter!==p9&&k.minFilter!==xJ)return Math.log2(Math.max(O.width,O.height))+1;else if(k.mipmaps!==void 0&&k.mipmaps.length>0)return k.mipmaps.length;else if(k.isCompressedTexture&&Array.isArray(k.image))return O.mipmaps.length;else return 1}function P(k){let O=k.target;if(O.removeEventListener("dispose",P),B(O),O.isVideoTexture)N.delete(O);if(O.isHTMLTexture)q.delete(O)}function L(k){let O=k.target;O.removeEventListener("dispose",L),v(O)}function B(k){let O=Z.get(k);if(O.__webglInit===void 0)return;let w=k.source,g=D.get(w);if(g){let e=g[O.__cacheKey];if(e.usedTimes--,e.usedTimes===0)l(k);if(Object.keys(g).length===0)D.delete(w)}Z.remove(k)}function l(k){let O=Z.get(k);J.deleteTexture(O.__webglTexture);let w=k.source,g=D.get(w);delete g[O.__cacheKey],H.memory.textures--}function v(k){let O=Z.get(k);if(k.depthTexture)k.depthTexture.dispose(),Z.remove(k.depthTexture);if(k.isWebGLCubeRenderTarget)for(let g=0;g<6;g++){if(Array.isArray(O.__webglFramebuffer[g]))for(let e=0;e<O.__webglFramebuffer[g].length;e++)J.deleteFramebuffer(O.__webglFramebuffer[g][e]);else J.deleteFramebuffer(O.__webglFramebuffer[g]);if(O.__webglDepthbuffer)J.deleteRenderbuffer(O.__webglDepthbuffer[g])}else{if(Array.isArray(O.__webglFramebuffer))for(let g=0;g<O.__webglFramebuffer.length;g++)J.deleteFramebuffer(O.__webglFramebuffer[g]);else J.deleteFramebuffer(O.__webglFramebuffer);if(O.__webglDepthbuffer)J.deleteRenderbuffer(O.__webglDepthbuffer);if(O.__webglMultisampledFramebuffer)J.deleteFramebuffer(O.__webglMultisampledFramebuffer);if(O.__webglColorRenderbuffer){for(let g=0;g<O.__webglColorRenderbuffer.length;g++)if(O.__webglColorRenderbuffer[g])J.deleteRenderbuffer(O.__webglColorRenderbuffer[g])}if(O.__webglDepthRenderbuffer)J.deleteRenderbuffer(O.__webglDepthRenderbuffer)}let w=k.textures;for(let g=0,e=w.length;g<e;g++){let W0=Z.get(w[g]);if(W0.__webglTexture)J.deleteTexture(W0.__webglTexture),H.memory.textures--;Z.remove(w[g])}Z.remove(k)}let h=0;function r(){h=0}function j(){return h}function d(k){h=k}function o(){let k=h;if(k>=K.maxTextures)P0("WebGLTextures: Trying to use "+(k+1)+" texture units while this GPU supports only "+K.maxTextures);return h+=1,k}function m(k){let O=[];return O.push(k.wrapS),O.push(k.wrapT),O.push(k.wrapR||0),O.push(k.magFilter),O.push(k.minFilter),O.push(k.anisotropy),O.push(k.internalFormat),O.push(k.format),O.push(k.type),O.push(k.generateMipmaps),O.push(k.premultiplyAlpha),O.push(k.flipY),O.push(k.unpackAlignment),O.push(k.colorSpace),O.join()}function Q0(k,O){let w=Z.get(k);if(k.isVideoTexture)hJ(k);if(k.isRenderTargetTexture===!1&&k.isExternalTexture!==!0&&k.version>0&&w.__version!==k.version){let g=k.image;if(g===null)P0("WebGLRenderer: Texture marked for update but no image data found.");else if(g.complete===!1)P0("WebGLRenderer: Texture marked for update but image is incomplete");else{A0(w,k,O);return}}else if(k.isExternalTexture)w.__webglTexture=k.sourceTexture?k.sourceTexture:null;$.bindTexture(J.TEXTURE_2D,w.__webglTexture,J.TEXTURE0+O)}function c(k,O){let w=Z.get(k);if(k.isRenderTargetTexture===!1&&k.version>0&&w.__version!==k.version){A0(w,k,O);return}else if(k.isExternalTexture)w.__webglTexture=k.sourceTexture?k.sourceTexture:null;$.bindTexture(J.TEXTURE_2D_ARRAY,w.__webglTexture,J.TEXTURE0+O)}function a(k,O){let w=Z.get(k);if(k.isRenderTargetTexture===!1&&k.version>0&&w.__version!==k.version){A0(w,k,O);return}$.bindTexture(J.TEXTURE_3D,w.__webglTexture,J.TEXTURE0+O)}function J0(k,O){let w=Z.get(k);if(k.isCubeDepthTexture!==!0&&k.version>0&&w.__version!==k.version){T0(w,k,O);return}$.bindTexture(J.TEXTURE_CUBE_MAP,w.__webglTexture,J.TEXTURE0+O)}let _0={[eZ]:J.REPEAT,[d7]:J.CLAMP_TO_EDGE,[JK]:J.MIRRORED_REPEAT},z0={[p9]:J.NEAREST,[QK]:J.NEAREST_MIPMAP_NEAREST,[W7]:J.NEAREST_MIPMAP_LINEAR,[xJ]:J.LINEAR,[u7]:J.LINEAR_MIPMAP_NEAREST,[r9]:J.LINEAR_MIPMAP_LINEAR},QJ={[NK]:J.NEVER,[OK]:J.ALWAYS,[qK]:J.LESS,[r7]:J.LEQUAL,[EK]:J.EQUAL,[t7]:J.GEQUAL,[FK]:J.GREATER,[DK]:J.NOTEQUAL};function h0(k,O){if(O.type===P9&&Q.has("OES_texture_float_linear")===!1&&(O.magFilter===xJ||O.magFilter===u7||O.magFilter===W7||O.magFilter===r9||O.minFilter===xJ||O.minFilter===u7||O.minFilter===W7||O.minFilter===r9))P0("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");if(J.texParameteri(k,J.TEXTURE_WRAP_S,_0[O.wrapS]),J.texParameteri(k,J.TEXTURE_WRAP_T,_0[O.wrapT]),k===J.TEXTURE_3D||k===J.TEXTURE_2D_ARRAY)J.texParameteri(k,J.TEXTURE_WRAP_R,_0[O.wrapR]);if(J.texParameteri(k,J.TEXTURE_MAG_FILTER,z0[O.magFilter]),J.texParameteri(k,J.TEXTURE_MIN_FILTER,z0[O.minFilter]),O.compareFunction)J.texParameteri(k,J.TEXTURE_COMPARE_MODE,J.COMPARE_REF_TO_TEXTURE),J.texParameteri(k,J.TEXTURE_COMPARE_FUNC,QJ[O.compareFunction]);if(Q.has("EXT_texture_filter_anisotropic")===!0){if(O.magFilter===p9)return;if(O.minFilter!==W7&&O.minFilter!==r9)return;if(O.type===P9&&Q.has("OES_texture_float_linear")===!1)return;if(O.anisotropy>1||Z.get(O).__currentAnisotropy){let w=Q.get("EXT_texture_filter_anisotropic");J.texParameterf(k,w.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(O.anisotropy,K.getMaxAnisotropy())),Z.get(O).__currentAnisotropy=O.anisotropy}}}function n(k,O){let w=!1;if(k.__webglInit===void 0)k.__webglInit=!0,O.addEventListener("dispose",P);let g=O.source,e=D.get(g);if(e===void 0)e={},D.set(g,e);let W0=m(O);if(W0!==k.__cacheKey){if(e[W0]===void 0)e[W0]={texture:J.createTexture(),usedTimes:0},H.memory.textures++,w=!0;e[W0].usedTimes++;let X0=e[k.__cacheKey];if(X0!==void 0){if(e[k.__cacheKey].usedTimes--,X0.usedTimes===0)l(O)}k.__cacheKey=W0,k.__webglTexture=e[W0].texture}return w}function $0(k,O,w){return Math.floor(Math.floor(k/w)/O)}function K0(k,O,w,g){let W0=k.updateRanges;if(W0.length===0)$.texSubImage2D(J.TEXTURE_2D,0,0,0,O.width,O.height,w,g,O.data);else{W0.sort((V0,U0)=>V0.start-U0.start);let X0=0;for(let V0=1;V0<W0.length;V0++){let U0=W0[X0],Z0=W0[V0],I0=U0.start+U0.count,C0=$0(Z0.start,O.width,4),c0=$0(U0.start,O.width,4);if(Z0.start<=I0+1&&C0===c0&&$0(Z0.start+Z0.count-1,O.width,4)===C0)U0.count=Math.max(U0.count,Z0.start+Z0.count-U0.start);else++X0,W0[X0]=Z0}W0.length=X0+1;let u=$.getParameter(J.UNPACK_ROW_LENGTH),i=$.getParameter(J.UNPACK_SKIP_PIXELS),F0=$.getParameter(J.UNPACK_SKIP_ROWS);$.pixelStorei(J.UNPACK_ROW_LENGTH,O.width);for(let V0=0,U0=W0.length;V0<U0;V0++){let Z0=W0[V0],I0=Math.floor(Z0.start/4),C0=Math.ceil(Z0.count/4),c0=I0%O.width,y=Math.floor(I0/O.width),H0=C0,s=1;$.pixelStorei(J.UNPACK_SKIP_PIXELS,c0),$.pixelStorei(J.UNPACK_SKIP_ROWS,y),$.texSubImage2D(J.TEXTURE_2D,0,c0,y,H0,1,w,g,O.data)}k.clearUpdateRanges(),$.pixelStorei(J.UNPACK_ROW_LENGTH,u),$.pixelStorei(J.UNPACK_SKIP_PIXELS,i),$.pixelStorei(J.UNPACK_SKIP_ROWS,F0)}}function A0(k,O,w){let g=J.TEXTURE_2D;if(O.isDataArrayTexture||O.isCompressedArrayTexture)g=J.TEXTURE_2D_ARRAY;if(O.isData3DTexture)g=J.TEXTURE_3D;let e=n(k,O),W0=O.source;$.bindTexture(g,k.__webglTexture,J.TEXTURE0+w);let X0=Z.get(W0);if(W0.version!==X0.__version||e===!0){if($.activeTexture(J.TEXTURE0+w),(typeof ImageBitmap<"u"&&O.image instanceof ImageBitmap)===!1){let s=m0.getPrimaries(m0.workingColorSpace),Y0=O.colorSpace===Q8?null:m0.getPrimaries(O.colorSpace),D0=O.colorSpace===Q8||s===Y0?J.NONE:J.BROWSER_DEFAULT_WEBGL;$.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,O.flipY),$.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),$.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,D0)}$.pixelStorei(J.UNPACK_ALIGNMENT,O.unpackAlignment);let i=F(O.image,!1,K.maxTextureSize);i=n0(O,i);let F0=W.convert(O.format,O.colorSpace),V0=W.convert(O.type),U0=V(O.internalFormat,F0,V0,O.normalized,O.colorSpace,O.isVideoTexture);h0(g,O);let Z0,I0=O.mipmaps,C0=O.isVideoTexture!==!0,c0=X0.__version===void 0||e===!0,y=W0.dataReady,H0=C(O,i);if(O.isDepthTexture){if(U0=z(O.format===e9,O.type),c0)if(C0)$.texStorage2D(J.TEXTURE_2D,1,U0,i.width,i.height);else $.texImage2D(J.TEXTURE_2D,0,U0,i.width,i.height,0,F0,V0,null)}else if(O.isDataTexture)if(I0.length>0){if(C0&&c0)$.texStorage2D(J.TEXTURE_2D,H0,U0,I0[0].width,I0[0].height);for(let s=0,Y0=I0.length;s<Y0;s++)if(Z0=I0[s],C0){if(y)$.texSubImage2D(J.TEXTURE_2D,s,0,0,Z0.width,Z0.height,F0,V0,Z0.data)}else $.texImage2D(J.TEXTURE_2D,s,U0,Z0.width,Z0.height,0,F0,V0,Z0.data);O.generateMipmaps=!1}else if(C0){if(c0)$.texStorage2D(J.TEXTURE_2D,H0,U0,i.width,i.height);if(y)K0(O,i,F0,V0)}else $.texImage2D(J.TEXTURE_2D,0,U0,i.width,i.height,0,F0,V0,i.data);else if(O.isCompressedTexture)if(O.isCompressedArrayTexture){if(C0&&c0)$.texStorage3D(J.TEXTURE_2D_ARRAY,H0,U0,I0[0].width,I0[0].height,i.depth);for(let s=0,Y0=I0.length;s<Y0;s++)if(Z0=I0[s],O.format!==D9)if(F0!==null)if(C0){if(y)if(O.layerUpdates.size>0){let D0=F$(Z0.width,Z0.height,O.format,O.type);for(let t of O.layerUpdates){let N0=Z0.data.subarray(t*D0/Z0.data.BYTES_PER_ELEMENT,(t+1)*D0/Z0.data.BYTES_PER_ELEMENT);$.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,s,0,0,t,Z0.width,Z0.height,1,F0,N0)}}else $.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,s,0,0,0,Z0.width,Z0.height,i.depth,F0,Z0.data)}else $.compressedTexImage3D(J.TEXTURE_2D_ARRAY,s,U0,Z0.width,Z0.height,i.depth,0,Z0.data,0,0);else P0("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(C0){if(y)$.texSubImage3D(J.TEXTURE_2D_ARRAY,s,0,0,0,Z0.width,Z0.height,i.depth,F0,V0,Z0.data)}else $.texImage3D(J.TEXTURE_2D_ARRAY,s,U0,Z0.width,Z0.height,i.depth,0,F0,V0,Z0.data);if(O.layerUpdates.size>0)O.clearLayerUpdates()}else{if(C0&&c0)$.texStorage2D(J.TEXTURE_2D,H0,U0,I0[0].width,I0[0].height);for(let s=0,Y0=I0.length;s<Y0;s++)if(Z0=I0[s],O.format!==D9)if(F0!==null)if(C0){if(y)$.compressedTexSubImage2D(J.TEXTURE_2D,s,0,0,Z0.width,Z0.height,F0,Z0.data)}else $.compressedTexImage2D(J.TEXTURE_2D,s,U0,Z0.width,Z0.height,0,Z0.data);else P0("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(C0){if(y)$.texSubImage2D(J.TEXTURE_2D,s,0,0,Z0.width,Z0.height,F0,V0,Z0.data)}else $.texImage2D(J.TEXTURE_2D,s,U0,Z0.width,Z0.height,0,F0,V0,Z0.data)}else if(O.isDataArrayTexture)if(C0){if(c0)$.texStorage3D(J.TEXTURE_2D_ARRAY,H0,U0,i.width,i.height,i.depth);if(y)if(O.layerUpdates.size>0){let s=F$(i.width,i.height,O.format,O.type);for(let Y0 of O.layerUpdates){let D0=i.data.subarray(Y0*s/i.data.BYTES_PER_ELEMENT,(Y0+1)*s/i.data.BYTES_PER_ELEMENT);$.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,Y0,i.width,i.height,1,F0,V0,D0)}O.clearLayerUpdates()}else $.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,0,i.width,i.height,i.depth,F0,V0,i.data)}else $.texImage3D(J.TEXTURE_2D_ARRAY,0,U0,i.width,i.height,i.depth,0,F0,V0,i.data);else if(O.isData3DTexture)if(C0){if(c0)$.texStorage3D(J.TEXTURE_3D,H0,U0,i.width,i.height,i.depth);if(y)$.texSubImage3D(J.TEXTURE_3D,0,0,0,0,i.width,i.height,i.depth,F0,V0,i.data)}else $.texImage3D(J.TEXTURE_3D,0,U0,i.width,i.height,i.depth,0,F0,V0,i.data);else if(O.isFramebufferTexture){if(c0)if(C0)$.texStorage2D(J.TEXTURE_2D,H0,U0,i.width,i.height);else{let{width:s,height:Y0}=i;for(let D0=0;D0<H0;D0++)$.texImage2D(J.TEXTURE_2D,D0,U0,s,Y0,0,F0,V0,null),s>>=1,Y0>>=1}}else if(O.isHTMLTexture){if("texElementImage2D"in J){let s=J.canvas;if(!s.hasAttribute("layoutsubtree"))s.setAttribute("layoutsubtree","true");if(i.parentNode!==s){s.appendChild(i),q.add(O),s.onpaint=(Y0)=>{let D0=Y0.changedElements;for(let t of q)if(D0.includes(t.image))t.needsUpdate=!0},s.requestPaint();return}if(J.texElementImage2D.length===3)J.texElementImage2D(J.TEXTURE_2D,J.RGBA8,i);else{let{RGBA:D0,RGBA:t,UNSIGNED_BYTE:N0}=J;J.texElementImage2D(J.TEXTURE_2D,0,D0,t,N0,i)}J.texParameteri(J.TEXTURE_2D,J.TEXTURE_MIN_FILTER,J.LINEAR),J.texParameteri(J.TEXTURE_2D,J.TEXTURE_WRAP_S,J.CLAMP_TO_EDGE),J.texParameteri(J.TEXTURE_2D,J.TEXTURE_WRAP_T,J.CLAMP_TO_EDGE)}}else if(I0.length>0){if(C0&&c0){let s=XJ(I0[0]);$.texStorage2D(J.TEXTURE_2D,H0,U0,s.width,s.height)}for(let s=0,Y0=I0.length;s<Y0;s++)if(Z0=I0[s],C0){if(y)$.texSubImage2D(J.TEXTURE_2D,s,0,0,F0,V0,Z0)}else $.texImage2D(J.TEXTURE_2D,s,U0,F0,V0,Z0);O.generateMipmaps=!1}else if(C0){if(c0){let s=XJ(i);$.texStorage2D(J.TEXTURE_2D,H0,U0,s.width,s.height)}if(y)$.texSubImage2D(J.TEXTURE_2D,0,0,0,F0,V0,i)}else $.texImage2D(J.TEXTURE_2D,0,U0,F0,V0,i);if(E(O))A(g);if(X0.__version=W0.version,O.onUpdate)O.onUpdate(O)}k.__version=O.version}function T0(k,O,w){if(O.image.length!==6)return;let g=n(k,O),e=O.source;$.bindTexture(J.TEXTURE_CUBE_MAP,k.__webglTexture,J.TEXTURE0+w);let W0=Z.get(e);if(e.version!==W0.__version||g===!0){$.activeTexture(J.TEXTURE0+w);let X0=m0.getPrimaries(m0.workingColorSpace),u=O.colorSpace===Q8?null:m0.getPrimaries(O.colorSpace),i=O.colorSpace===Q8||X0===u?J.NONE:J.BROWSER_DEFAULT_WEBGL;$.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,O.flipY),$.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),$.pixelStorei(J.UNPACK_ALIGNMENT,O.unpackAlignment),$.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,i);let F0=O.isCompressedTexture||O.image[0].isCompressedTexture,V0=O.image[0]&&O.image[0].isDataTexture,U0=[];for(let t=0;t<6;t++){if(!F0&&!V0)U0[t]=F(O.image[t],!0,K.maxCubemapSize);else U0[t]=V0?O.image[t].image:O.image[t];U0[t]=n0(O,U0[t])}let Z0=U0[0],I0=W.convert(O.format,O.colorSpace),C0=W.convert(O.type),c0=V(O.internalFormat,I0,C0,O.normalized,O.colorSpace),y=O.isVideoTexture!==!0,H0=W0.__version===void 0||g===!0,s=e.dataReady,Y0=C(O,Z0);h0(J.TEXTURE_CUBE_MAP,O);let D0;if(F0){if(y&&H0)$.texStorage2D(J.TEXTURE_CUBE_MAP,Y0,c0,Z0.width,Z0.height);for(let t=0;t<6;t++){D0=U0[t].mipmaps;for(let N0=0;N0<D0.length;N0++){let y0=D0[N0];if(O.format!==D9)if(I0!==null)if(y){if(s)$.compressedTexSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0,0,0,y0.width,y0.height,I0,y0.data)}else $.compressedTexImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0,c0,y0.width,y0.height,0,y0.data);else P0("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");else if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0,0,0,y0.width,y0.height,I0,C0,y0.data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0,c0,y0.width,y0.height,0,I0,C0,y0.data)}}}else{if(D0=O.mipmaps,y&&H0){if(D0.length>0)Y0++;let t=XJ(U0[0]);$.texStorage2D(J.TEXTURE_CUBE_MAP,Y0,c0,t.width,t.height)}for(let t=0;t<6;t++)if(V0){if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,U0[t].width,U0[t].height,I0,C0,U0[t].data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,c0,U0[t].width,U0[t].height,0,I0,C0,U0[t].data);for(let N0=0;N0<D0.length;N0++){let $J=D0[N0].image[t].image;if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0+1,0,0,$J.width,$J.height,I0,C0,$J.data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0+1,c0,$J.width,$J.height,0,I0,C0,$J.data)}}else{if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,I0,C0,U0[t])}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,c0,I0,C0,U0[t]);for(let N0=0;N0<D0.length;N0++){let y0=D0[N0];if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0+1,0,0,I0,C0,y0.image[t])}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0+1,c0,I0,C0,y0.image[t])}}}if(E(O))A(J.TEXTURE_CUBE_MAP);if(W0.__version=e.version,O.onUpdate)O.onUpdate(O)}k.__version=O.version}function B0(k,O,w,g,e,W0){let X0=W.convert(w.format,w.colorSpace),u=W.convert(w.type),i=V(w.internalFormat,X0,u,w.normalized,w.colorSpace),F0=Z.get(O),V0=Z.get(w);if(V0.__renderTarget=O,!F0.__hasExternalTextures){let U0=Math.max(1,O.width>>W0),Z0=Math.max(1,O.height>>W0);if(e===J.TEXTURE_3D||e===J.TEXTURE_2D_ARRAY)$.texImage3D(e,W0,i,U0,Z0,O.depth,0,X0,u,null);else $.texImage2D(e,W0,i,U0,Z0,0,X0,u,null)}if($.bindFramebuffer(J.FRAMEBUFFER,k),T(O))Y.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,g,e,V0.__webglTexture,0,OJ(O));else if(e===J.TEXTURE_2D||e>=J.TEXTURE_CUBE_MAP_POSITIVE_X&&e<=J.TEXTURE_CUBE_MAP_NEGATIVE_Z)J.framebufferTexture2D(J.FRAMEBUFFER,g,e,V0.__webglTexture,W0);$.bindFramebuffer(J.FRAMEBUFFER,null)}function FJ(k,O,w){if(J.bindRenderbuffer(J.RENDERBUFFER,k),O.depthBuffer){let g=O.depthTexture,e=g&&g.isDepthTexture?g.type:null,W0=z(O.stencilBuffer,e),X0=O.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;if(T(O))Y.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,OJ(O),W0,O.width,O.height);else if(w)J.renderbufferStorageMultisample(J.RENDERBUFFER,OJ(O),W0,O.width,O.height);else J.renderbufferStorage(J.RENDERBUFFER,W0,O.width,O.height);J.framebufferRenderbuffer(J.FRAMEBUFFER,X0,J.RENDERBUFFER,k)}else{let g=O.textures;for(let e=0;e<g.length;e++){let W0=g[e],X0=W.convert(W0.format,W0.colorSpace),u=W.convert(W0.type),i=V(W0.internalFormat,X0,u,W0.normalized,W0.colorSpace);if(T(O))Y.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,OJ(O),i,O.width,O.height);else if(w)J.renderbufferStorageMultisample(J.RENDERBUFFER,OJ(O),i,O.width,O.height);else J.renderbufferStorage(J.RENDERBUFFER,i,O.width,O.height)}}J.bindRenderbuffer(J.RENDERBUFFER,null)}function p0(k,O,w){let g=O.isWebGLCubeRenderTarget===!0;if($.bindFramebuffer(J.FRAMEBUFFER,k),!(O.depthTexture&&O.depthTexture.isDepthTexture))throw Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let e=Z.get(O.depthTexture);if(e.__renderTarget=O,!e.__webglTexture||O.depthTexture.image.width!==O.width||O.depthTexture.image.height!==O.height)O.depthTexture.image.width=O.width,O.depthTexture.image.height=O.height,O.depthTexture.needsUpdate=!0;if(g){if(e.__webglInit===void 0)e.__webglInit=!0,O.depthTexture.addEventListener("dispose",P);if(e.__webglTexture===void 0){e.__webglTexture=J.createTexture(),$.bindTexture(J.TEXTURE_CUBE_MAP,e.__webglTexture),h0(J.TEXTURE_CUBE_MAP,O.depthTexture);let F0=W.convert(O.depthTexture.format),V0=W.convert(O.depthTexture.type),U0;if(O.depthTexture.format===t9)U0=J.DEPTH_COMPONENT24;else if(O.depthTexture.format===e9)U0=J.DEPTH24_STENCIL8;for(let Z0=0;Z0<6;Z0++)J.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+Z0,0,U0,O.width,O.height,0,F0,V0,null)}}else Q0(O.depthTexture,0);let W0=e.__webglTexture,X0=OJ(O),u=g?J.TEXTURE_CUBE_MAP_POSITIVE_X+w:J.TEXTURE_2D,i=O.depthTexture.format===e9?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;if(O.depthTexture.format===t9)if(T(O))Y.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,i,u,W0,0,X0);else J.framebufferTexture2D(J.FRAMEBUFFER,i,u,W0,0);else if(O.depthTexture.format===e9)if(T(O))Y.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,i,u,W0,0,X0);else J.framebufferTexture2D(J.FRAMEBUFFER,i,u,W0,0);else throw Error("THREE.WebGLTextures: Unknown depthTexture format.")}function l0(k){let O=Z.get(k),w=k.isWebGLCubeRenderTarget===!0;if(O.__boundDepthTexture!==k.depthTexture){let g=k.depthTexture;if(O.__depthDisposeCallback)O.__depthDisposeCallback();if(g){let e=()=>{delete O.__boundDepthTexture,delete O.__depthDisposeCallback,g.removeEventListener("dispose",e)};g.addEventListener("dispose",e),O.__depthDisposeCallback=e}O.__boundDepthTexture=g}if(k.depthTexture&&!O.__autoAllocateDepthBuffer)if(w)for(let g=0;g<6;g++)p0(O.__webglFramebuffer[g],k,g);else{let g=k.texture.mipmaps;if(g&&g.length>0)p0(O.__webglFramebuffer[0],k,0);else p0(O.__webglFramebuffer,k,0)}else if(w){O.__webglDepthbuffer=[];for(let g=0;g<6;g++)if($.bindFramebuffer(J.FRAMEBUFFER,O.__webglFramebuffer[g]),O.__webglDepthbuffer[g]===void 0)O.__webglDepthbuffer[g]=J.createRenderbuffer(),FJ(O.__webglDepthbuffer[g],k,!1);else{let e=k.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,W0=O.__webglDepthbuffer[g];J.bindRenderbuffer(J.RENDERBUFFER,W0),J.framebufferRenderbuffer(J.FRAMEBUFFER,e,J.RENDERBUFFER,W0)}}else{let g=k.texture.mipmaps;if(g&&g.length>0)$.bindFramebuffer(J.FRAMEBUFFER,O.__webglFramebuffer[0]);else $.bindFramebuffer(J.FRAMEBUFFER,O.__webglFramebuffer);if(O.__webglDepthbuffer===void 0)O.__webglDepthbuffer=J.createRenderbuffer(),FJ(O.__webglDepthbuffer,k,!1);else{let e=k.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,W0=O.__webglDepthbuffer;J.bindRenderbuffer(J.RENDERBUFFER,W0),J.framebufferRenderbuffer(J.FRAMEBUFFER,e,J.RENDERBUFFER,W0)}}$.bindFramebuffer(J.FRAMEBUFFER,null)}function o0(k,O,w){let g=Z.get(k);if(O!==void 0)B0(g.__webglFramebuffer,k,k.texture,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,0);if(w!==void 0)l0(k)}function d0(k){let O=k.texture,w=Z.get(k),g=Z.get(O);k.addEventListener("dispose",L);let e=k.textures,W0=k.isWebGLCubeRenderTarget===!0,X0=e.length>1;if(!X0){if(g.__webglTexture===void 0)g.__webglTexture=J.createTexture();g.__version=O.version,H.memory.textures++}if(W0){w.__webglFramebuffer=[];for(let u=0;u<6;u++)if(O.mipmaps&&O.mipmaps.length>0){w.__webglFramebuffer[u]=[];for(let i=0;i<O.mipmaps.length;i++)w.__webglFramebuffer[u][i]=J.createFramebuffer()}else w.__webglFramebuffer[u]=J.createFramebuffer()}else{if(O.mipmaps&&O.mipmaps.length>0){w.__webglFramebuffer=[];for(let u=0;u<O.mipmaps.length;u++)w.__webglFramebuffer[u]=J.createFramebuffer()}else w.__webglFramebuffer=J.createFramebuffer();if(X0)for(let u=0,i=e.length;u<i;u++){let F0=Z.get(e[u]);if(F0.__webglTexture===void 0)F0.__webglTexture=J.createTexture(),H.memory.textures++}if(k.samples>0&&T(k)===!1){w.__webglMultisampledFramebuffer=J.createFramebuffer(),w.__webglColorRenderbuffer=[],$.bindFramebuffer(J.FRAMEBUFFER,w.__webglMultisampledFramebuffer);for(let u=0;u<e.length;u++){let i=e[u];w.__webglColorRenderbuffer[u]=J.createRenderbuffer(),J.bindRenderbuffer(J.RENDERBUFFER,w.__webglColorRenderbuffer[u]);let F0=W.convert(i.format,i.colorSpace),V0=W.convert(i.type),U0=V(i.internalFormat,F0,V0,i.normalized,i.colorSpace,k.isXRRenderTarget===!0),Z0=OJ(k);J.renderbufferStorageMultisample(J.RENDERBUFFER,Z0,U0,k.width,k.height),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+u,J.RENDERBUFFER,w.__webglColorRenderbuffer[u])}if(J.bindRenderbuffer(J.RENDERBUFFER,null),k.depthBuffer)w.__webglDepthRenderbuffer=J.createRenderbuffer(),FJ(w.__webglDepthRenderbuffer,k,!0);$.bindFramebuffer(J.FRAMEBUFFER,null)}}if(W0){$.bindTexture(J.TEXTURE_CUBE_MAP,g.__webglTexture),h0(J.TEXTURE_CUBE_MAP,O);for(let u=0;u<6;u++)if(O.mipmaps&&O.mipmaps.length>0)for(let i=0;i<O.mipmaps.length;i++)B0(w.__webglFramebuffer[u][i],k,O,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+u,i);else B0(w.__webglFramebuffer[u],k,O,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+u,0);if(E(O))A(J.TEXTURE_CUBE_MAP);$.unbindTexture()}else if(X0){for(let u=0,i=e.length;u<i;u++){let F0=e[u],V0=Z.get(F0),U0=J.TEXTURE_2D;if(k.isWebGL3DRenderTarget||k.isWebGLArrayRenderTarget)U0=k.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if($.bindTexture(U0,V0.__webglTexture),h0(U0,F0),B0(w.__webglFramebuffer,k,F0,J.COLOR_ATTACHMENT0+u,U0,0),E(F0))A(U0)}$.unbindTexture()}else{let u=J.TEXTURE_2D;if(k.isWebGL3DRenderTarget||k.isWebGLArrayRenderTarget)u=k.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if($.bindTexture(u,g.__webglTexture),h0(u,O),O.mipmaps&&O.mipmaps.length>0)for(let i=0;i<O.mipmaps.length;i++)B0(w.__webglFramebuffer[i],k,O,J.COLOR_ATTACHMENT0,u,i);else B0(w.__webglFramebuffer,k,O,J.COLOR_ATTACHMENT0,u,0);if(E(O))A(u);$.unbindTexture()}if(k.depthBuffer)l0(k)}function BJ(k){let O=k.textures;for(let w=0,g=O.length;w<g;w++){let e=O[w];if(E(e)){let W0=_(k),X0=Z.get(e).__webglTexture;$.bindTexture(W0,X0),A(W0),$.unbindTexture()}}}let HJ=[],vJ=[];function DJ(k){if(k.samples>0){if(T(k)===!1){let{textures:O,width:w,height:g}=k,e=J.COLOR_BUFFER_BIT,W0=k.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,X0=Z.get(k),u=O.length>1;if(u)for(let F0=0;F0<O.length;F0++)$.bindFramebuffer(J.FRAMEBUFFER,X0.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+F0,J.RENDERBUFFER,null),$.bindFramebuffer(J.FRAMEBUFFER,X0.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+F0,J.TEXTURE_2D,null,0);$.bindFramebuffer(J.READ_FRAMEBUFFER,X0.__webglMultisampledFramebuffer);let i=k.texture.mipmaps;if(i&&i.length>0)$.bindFramebuffer(J.DRAW_FRAMEBUFFER,X0.__webglFramebuffer[0]);else $.bindFramebuffer(J.DRAW_FRAMEBUFFER,X0.__webglFramebuffer);for(let F0=0;F0<O.length;F0++){if(k.resolveDepthBuffer){if(k.depthBuffer)e|=J.DEPTH_BUFFER_BIT;if(k.stencilBuffer&&k.resolveStencilBuffer)e|=J.STENCIL_BUFFER_BIT}if(u){J.framebufferRenderbuffer(J.READ_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.RENDERBUFFER,X0.__webglColorRenderbuffer[F0]);let V0=Z.get(O[F0]).__webglTexture;J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,V0,0)}if(J.blitFramebuffer(0,0,w,g,0,0,w,g,e,J.NEAREST),X===!0){if(HJ.length=0,vJ.length=0,HJ.push(J.COLOR_ATTACHMENT0+F0),k.depthBuffer&&k.storeMultisampledDepthBuffer===!1)HJ.push(W0),vJ.push(W0),J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,vJ);J.invalidateFramebuffer(J.READ_FRAMEBUFFER,HJ)}}if($.bindFramebuffer(J.READ_FRAMEBUFFER,null),$.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),u)for(let F0=0;F0<O.length;F0++){$.bindFramebuffer(J.FRAMEBUFFER,X0.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+F0,J.RENDERBUFFER,X0.__webglColorRenderbuffer[F0]);let V0=Z.get(O[F0]).__webglTexture;$.bindFramebuffer(J.FRAMEBUFFER,X0.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+F0,J.TEXTURE_2D,V0,0)}$.bindFramebuffer(J.DRAW_FRAMEBUFFER,X0.__webglMultisampledFramebuffer)}else if(k.depthBuffer&&k.storeMultisampledDepthBuffer===!1&&X){let O=k.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,[O])}}}function OJ(k){return Math.min(K.maxSamples,k.samples)}function T(k){let O=Z.get(k);return k.samples>0&&Q.has("WEBGL_multisampled_render_to_texture")===!0&&O.__useRenderToTexture!==!1}function hJ(k){let O=H.render.frame;if(N.get(k)!==O)N.set(k,O),k.update()}function n0(k,O){let{colorSpace:w,format:g,type:e}=k;if(k.isCompressedTexture===!0||k.isVideoTexture===!0)return O;if(w!==bQ&&w!==Q8)if(m0.getTransfer(w)===JJ){if(g!==D9||e!==Y9)P0("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.")}else S0("WebGLTextures: Unsupported texture color space:",w);return O}function XJ(k){if(typeof HTMLImageElement<"u"&&k instanceof HTMLImageElement)U.width=k.naturalWidth||k.width,U.height=k.naturalHeight||k.height;else if(typeof VideoFrame<"u"&&k instanceof VideoFrame)U.width=k.displayWidth,U.height=k.displayHeight;else U.width=k.width,U.height=k.height;return U}this.allocateTextureUnit=o,this.resetTextureUnits=r,this.getTextureUnits=j,this.setTextureUnits=d,this.setTexture2D=Q0,this.setTexture2DArray=c,this.setTexture3D=a,this.setTextureCube=J0,this.rebindTextures=o0,this.setupRenderTarget=d0,this.updateRenderTargetMipmap=BJ,this.updateMultisampleRenderTarget=DJ,this.setupDepthRenderbuffer=l0,this.setupFrameBufferTexture=B0,this.useMultisampledRTT=T,this.isReversedDepthBuffer=function(){return $.buffers.depth.getReversed()}}function BN(J,Q){function $(Z,K=Q8){let W,H=m0.getTransfer(K);if(Z===Y9)return J.UNSIGNED_BYTE;if(Z===QQ)return J.UNSIGNED_SHORT_4_4_4_4;if(Z===$Q)return J.UNSIGNED_SHORT_5_5_5_1;if(Z===KK)return J.UNSIGNED_INT_5_9_9_9_REV;if(Z===WK)return J.UNSIGNED_INT_10F_11F_11F_REV;if(Z===$K)return J.BYTE;if(Z===ZK)return J.SHORT;if(Z===H7)return J.UNSIGNED_SHORT;if(Z===JQ)return J.INT;if(Z===m9)return J.UNSIGNED_INT;if(Z===P9)return J.FLOAT;if(Z===F9)return J.HALF_FLOAT;if(Z===HK)return J.ALPHA;if(Z===YK)return J.RGB;if(Z===D9)return J.RGBA;if(Z===t9)return J.DEPTH_COMPONENT;if(Z===e9)return J.DEPTH_STENCIL;if(Z===XK)return J.RED;if(Z===ZQ)return J.RED_INTEGER;if(Z===J8)return J.RG;if(Z===KQ)return J.RG_INTEGER;if(Z===WQ)return J.RGBA_INTEGER;if(Z===c7||Z===n7||Z===s7||Z===i7)if(H===JJ)if(W=Q.get("WEBGL_compressed_texture_s3tc_srgb"),W!==null){if(Z===c7)return W.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(Z===n7)return W.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(Z===s7)return W.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(Z===i7)return W.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(W=Q.get("WEBGL_compressed_texture_s3tc"),W!==null){if(Z===c7)return W.COMPRESSED_RGB_S3TC_DXT1_EXT;if(Z===n7)return W.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(Z===s7)return W.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(Z===i7)return W.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(Z===HQ||Z===YQ||Z===XQ||Z===UQ)if(W=Q.get("WEBGL_compressed_texture_pvrtc"),W!==null){if(Z===HQ)return W.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(Z===YQ)return W.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(Z===XQ)return W.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(Z===UQ)return W.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(Z===GQ||Z===NQ||Z===qQ||Z===EQ||Z===FQ||Z===o7||Z===DQ)if(W=Q.get("WEBGL_compressed_texture_etc"),W!==null){if(Z===GQ||Z===NQ)return H===JJ?W.COMPRESSED_SRGB8_ETC2:W.COMPRESSED_RGB8_ETC2;if(Z===qQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:W.COMPRESSED_RGBA8_ETC2_EAC;if(Z===EQ)return W.COMPRESSED_R11_EAC;if(Z===FQ)return W.COMPRESSED_SIGNED_R11_EAC;if(Z===o7)return W.COMPRESSED_RG11_EAC;if(Z===DQ)return W.COMPRESSED_SIGNED_RG11_EAC}else return null;if(Z===OQ||Z===RQ||Z===MQ||Z===LQ||Z===kQ||Z===VQ||Z===BQ||Z===IQ||Z===zQ||Z===AQ||Z===CQ||Z===PQ||Z===wQ||Z===_Q)if(W=Q.get("WEBGL_compressed_texture_astc"),W!==null){if(Z===OQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:W.COMPRESSED_RGBA_ASTC_4x4_KHR;if(Z===RQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:W.COMPRESSED_RGBA_ASTC_5x4_KHR;if(Z===MQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:W.COMPRESSED_RGBA_ASTC_5x5_KHR;if(Z===LQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:W.COMPRESSED_RGBA_ASTC_6x5_KHR;if(Z===kQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:W.COMPRESSED_RGBA_ASTC_6x6_KHR;if(Z===VQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:W.COMPRESSED_RGBA_ASTC_8x5_KHR;if(Z===BQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:W.COMPRESSED_RGBA_ASTC_8x6_KHR;if(Z===IQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:W.COMPRESSED_RGBA_ASTC_8x8_KHR;if(Z===zQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:W.COMPRESSED_RGBA_ASTC_10x5_KHR;if(Z===AQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:W.COMPRESSED_RGBA_ASTC_10x6_KHR;if(Z===CQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:W.COMPRESSED_RGBA_ASTC_10x8_KHR;if(Z===PQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:W.COMPRESSED_RGBA_ASTC_10x10_KHR;if(Z===wQ)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:W.COMPRESSED_RGBA_ASTC_12x10_KHR;if(Z===_Q)return H===JJ?W.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:W.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(Z===TQ||Z===SQ||Z===jQ)if(W=Q.get("EXT_texture_compression_bptc"),W!==null){if(Z===TQ)return H===JJ?W.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:W.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(Z===SQ)return W.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(Z===jQ)return W.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(Z===yQ||Z===fQ||Z===a7||Z===vQ)if(W=Q.get("EXT_texture_compression_rgtc"),W!==null){if(Z===yQ)return W.COMPRESSED_RED_RGTC1_EXT;if(Z===fQ)return W.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(Z===a7)return W.COMPRESSED_RED_GREEN_RGTC2_EXT;if(Z===vQ)return W.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;if(Z===b8)return J.UNSIGNED_INT_24_8;return J[Z]!==void 0?J[Z]:null}return{convert:$}}var IN=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,zN=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class KW{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(J,Q){if(this.texture===null){let $=new W6(J.texture);if(J.depthNear!==Q.depthNear||J.depthFar!==Q.depthFar)this.depthNear=J.depthNear,this.depthFar=J.depthFar;this.texture=$}}getMesh(J){if(this.texture!==null){if(this.mesh===null){let Q=J.cameras[0].viewport,$=new SJ({vertexShader:IN,fragmentShader:zN,uniforms:{depthColor:{value:this.texture},depthWidth:{value:Q.z},depthHeight:{value:Q.w}}});this.mesh=new zJ(new K8(20,20),$)}}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class WW extends O9{constructor(J,Q){super();let $=this,Z=null,K=1,W=null,H="local-floor",Y=1,X=null,U=null,N=null,q=null,G=null,D=null,M=typeof XRWebGLBinding<"u",I=new KW,F={},E=Q.getContextAttributes(),A=null,_=null,V=[],z=[],C=new w0,P=null,L=null,B=new uJ;B.viewport=new UJ;let l=new uJ;l.viewport=new UJ;let v=[B,l],h=new G$,r=null,j=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(n){let $0=V[n];if($0===void 0)$0=new U7,V[n]=$0;return $0.getTargetRaySpace()},this.getControllerGrip=function(n){let $0=V[n];if($0===void 0)$0=new U7,V[n]=$0;return $0.getGripSpace()},this.getHand=function(n){let $0=V[n];if($0===void 0)$0=new U7,V[n]=$0;return $0.getHandSpace()};function d(n){let $0=z.indexOf(n.inputSource);if($0===-1)return;let K0=V[$0];if(K0!==void 0)K0.update(n.inputSource,n.frame,X||W),K0.dispatchEvent({type:n.type,data:n.inputSource})}function o(){Z.removeEventListener("select",d),Z.removeEventListener("selectstart",d),Z.removeEventListener("selectend",d),Z.removeEventListener("squeeze",d),Z.removeEventListener("squeezestart",d),Z.removeEventListener("squeezeend",d),Z.removeEventListener("end",o),Z.removeEventListener("inputsourceschange",m);for(let n=0;n<V.length;n++){let $0=z[n];if($0===null)continue;z[n]=null,V[n].disconnect($0)}r=null,j=null,I.reset();for(let n in F)delete F[n];if(J.setRenderTarget(A),G=null,q=null,N=null,Z=null,_=null,h0.stop(),$.isPresenting=!1,J.setPixelRatio(P),J.setSize(C.width,C.height,!1),L!==null){let n=L.camera;n.fov=L.fov,n.zoom=L.zoom,n.updateProjectionMatrix(),L=null}$.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(n){if(K=n,$.isPresenting===!0)P0("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(n){if(H=n,$.isPresenting===!0)P0("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return X||W},this.setReferenceSpace=function(n){X=n},this.getBaseLayer=function(){return q!==null?q:G},this.getBinding=function(){if(N===null&&M)N=new XRWebGLBinding(Z,Q);return N},this.getFrame=function(){return D},this.getSession=function(){return Z},this.setSession=async function(n){if(Z=n,Z!==null){if(A=J.getRenderTarget(),Z.addEventListener("select",d),Z.addEventListener("selectstart",d),Z.addEventListener("selectend",d),Z.addEventListener("squeeze",d),Z.addEventListener("squeezestart",d),Z.addEventListener("squeezeend",d),Z.addEventListener("end",o),Z.addEventListener("inputsourceschange",m),E.xrCompatible!==!0)await Q.makeXRCompatible();if(P=J.getPixelRatio(),J.getSize(C),!(M&&("createProjectionLayer"in XRWebGLBinding.prototype))){let K0={antialias:E.antialias,alpha:!0,depth:E.depth,stencil:E.stencil,framebufferScaleFactor:K};G=new XRWebGLLayer(Z,Q,K0),Z.updateRenderState({baseLayer:G}),J.setPixelRatio(1),J.setSize(G.framebufferWidth,G.framebufferHeight,!1),_=new cJ(G.framebufferWidth,G.framebufferHeight,{format:D9,type:Y9,colorSpace:J.outputColorSpace,stencilBuffer:E.stencil,resolveDepthBuffer:G.ignoreDepthValues===!1,resolveStencilBuffer:G.ignoreDepthValues===!1,storeMultisampledDepthBuffer:G.ignoreDepthValues===!1,storeMultisampledStencilBuffer:G.ignoreDepthValues===!1})}else{let K0=null,A0=null,T0=null;if(E.depth)T0=E.stencil?Q.DEPTH24_STENCIL8:Q.DEPTH_COMPONENT24,K0=E.stencil?e9:t9,A0=E.stencil?b8:m9;let B0={colorFormat:Q.RGBA8,depthFormat:T0,scaleFactor:K};N=this.getBinding(),q=N.createProjectionLayer(B0),Z.updateRenderState({layers:[q]}),J.setPixelRatio(1),J.setSize(q.textureWidth,q.textureHeight,!1),_=new cJ(q.textureWidth,q.textureHeight,{format:D9,type:Y9,depthTexture:new Z8(q.textureWidth,q.textureHeight,A0,void 0,void 0,void 0,void 0,void 0,void 0,K0),stencilBuffer:E.stencil,colorSpace:J.outputColorSpace,samples:E.antialias?4:0,resolveDepthBuffer:q.ignoreDepthValues===!1,resolveStencilBuffer:q.ignoreDepthValues===!1,storeMultisampledDepthBuffer:q.ignoreDepthValues===!1,storeMultisampledStencilBuffer:q.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(Y),X=null,W=await Z.requestReferenceSpace(H),h0.setContext(Z),h0.start(),$.isPresenting=!0,$.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(Z!==null)return Z.environmentBlendMode},this.getDepthTexture=function(){return I.getDepthTexture()};function m(n){for(let $0=0;$0<n.removed.length;$0++){let K0=n.removed[$0],A0=z.indexOf(K0);if(A0>=0)z[A0]=null,V[A0].disconnect(K0)}for(let $0=0;$0<n.added.length;$0++){let K0=n.added[$0],A0=z.indexOf(K0);if(A0===-1){for(let B0=0;B0<V.length;B0++)if(B0>=z.length){z.push(K0),A0=B0;break}else if(z[B0]===null){z[B0]=K0,A0=B0;break}if(A0===-1)break}let T0=V[A0];if(T0)T0.connect(K0)}}let Q0=new f,c=new f;function a(n,$0,K0){Q0.setFromMatrixPosition($0.matrixWorld),c.setFromMatrixPosition(K0.matrixWorld);let A0=Q0.distanceTo(c),T0=$0.projectionMatrix.elements,B0=K0.projectionMatrix.elements,FJ=T0[14]/(T0[10]-1),p0=T0[14]/(T0[10]+1),l0=(T0[9]+1)/T0[5],o0=(T0[9]-1)/T0[5],d0=(T0[8]-1)/T0[0],BJ=(B0[8]+1)/B0[0],HJ=FJ*d0,vJ=FJ*BJ,DJ=A0/(-d0+BJ),OJ=DJ*-d0;if($0.matrixWorld.decompose(n.position,n.quaternion,n.scale),n.translateX(OJ),n.translateZ(DJ),n.matrixWorld.compose(n.position,n.quaternion,n.scale),n.matrixWorldInverse.copy(n.matrixWorld).invert(),T0[10]===-1)n.projectionMatrix.copy($0.projectionMatrix),n.projectionMatrixInverse.copy($0.projectionMatrixInverse);else{let T=FJ+DJ,hJ=p0+DJ,n0=HJ-OJ,XJ=vJ+(A0-OJ),k=l0*p0/hJ*T,O=o0*p0/hJ*T;n.projectionMatrix.makePerspective(n0,XJ,k,O,T,hJ),n.projectionMatrixInverse.copy(n.projectionMatrix).invert()}}function J0(n,$0){if($0===null)n.matrixWorld.copy(n.matrix);else n.matrixWorld.multiplyMatrices($0.matrixWorld,n.matrix);n.matrixWorldInverse.copy(n.matrixWorld).invert()}this.updateCamera=function(n){if(Z===null)return;let{near:$0,far:K0}=n;if(I.texture!==null){if(I.depthNear>0)$0=I.depthNear;if(I.depthFar>0)K0=I.depthFar}if(h.near=l.near=B.near=$0,h.far=l.far=B.far=K0,r!==h.near||j!==h.far)Z.updateRenderState({depthNear:h.near,depthFar:h.far}),r=h.near,j=h.far;h.layers.mask=n.layers.mask|6,B.layers.mask=h.layers.mask&-5,l.layers.mask=h.layers.mask&-3;let A0=n.parent,T0=h.cameras;J0(h,A0);for(let B0=0;B0<T0.length;B0++)J0(T0[B0],A0);if(T0.length===2)a(h,B,l);else h.projectionMatrix.copy(B.projectionMatrix);if(L===null&&n.isPerspectiveCamera)L={camera:n,fov:n.fov,zoom:n.zoom};_0(n,h,A0)};function _0(n,$0,K0){if(K0===null)n.matrix.copy($0.matrixWorld);else n.matrix.copy(K0.matrixWorld),n.matrix.invert(),n.matrix.multiply($0.matrixWorld);if(n.matrix.decompose(n.position,n.quaternion,n.scale),n.updateMatrixWorld(!0),n.projectionMatrix.copy($0.projectionMatrix),n.projectionMatrixInverse.copy($0.projectionMatrixInverse),n.isPerspectiveCamera)n.fov=j8*2*Math.atan(1/n.projectionMatrix.elements[5]),n.zoom=1}this.getCamera=function(){return h},this.getFoveation=function(){if(q===null&&G===null)return;return Y},this.setFoveation=function(n){if(Y=n,q!==null)q.fixedFoveation=n;if(G!==null&&G.fixedFoveation!==void 0)G.fixedFoveation=n},this.hasDepthSensing=function(){return I.texture!==null},this.getDepthSensingMesh=function(){return I.getMesh(h)},this.getCameraTexture=function(n){return F[n]};let z0=null;function QJ(n,$0){if(U=$0.getViewerPose(X||W),D=$0,U!==null){let K0=U.views;if(G!==null)J.setRenderTargetFramebuffer(_,G.framebuffer),J.setRenderTarget(_);let A0=!1;if(K0.length!==h.cameras.length)h.cameras.length=0,A0=!0;for(let p0=0;p0<K0.length;p0++){let l0=K0[p0],o0=null;if(G!==null)o0=G.getViewport(l0);else{let BJ=N.getViewSubImage(q,l0);if(o0=BJ.viewport,p0===0)J.setRenderTargetTextures(_,BJ.colorTexture,BJ.depthStencilTexture),J.setRenderTarget(_)}let d0=v[p0];if(d0===void 0)d0=new uJ,d0.layers.enable(p0),d0.viewport=new UJ,v[p0]=d0;if(d0.matrix.fromArray(l0.transform.matrix),d0.matrix.decompose(d0.position,d0.quaternion,d0.scale),d0.projectionMatrix.fromArray(l0.projectionMatrix),d0.projectionMatrixInverse.copy(d0.projectionMatrix).invert(),d0.viewport.set(o0.x,o0.y,o0.width,o0.height),p0===0)h.matrix.copy(d0.matrix),h.matrix.decompose(h.position,h.quaternion,h.scale);if(A0===!0)h.cameras.push(d0)}let T0=Z.enabledFeatures;if(T0&&T0.includes("depth-sensing")&&Z.depthUsage=="gpu-optimized"&&M){N=$.getBinding();let p0=N.getDepthInformation(K0[0]);if(p0&&p0.isValid&&p0.texture)I.init(p0,Z.renderState)}if(T0&&T0.includes("camera-access")&&M){J.state.unbindTexture(),N=$.getBinding();for(let p0=0;p0<K0.length;p0++){let l0=K0[p0].camera;if(l0){let o0=F[l0];if(!o0)o0=new W6,F[l0]=o0;let d0=N.getCameraImage(l0);o0.sourceTexture=d0}}}}for(let K0=0;K0<V.length;K0++){let A0=z[K0],T0=V[K0];if(A0!==null&&T0!==void 0)T0.update(A0,$0,X||W)}if(z0)z0(n,$0);if($0.detectedPlanes)$.dispatchEvent({type:"planesdetected",data:$0});D=null}let h0=new sK;h0.setAnimationLoop(QJ),this.setAnimationLoop=function(n){z0=n},this.dispose=function(){}}}var AN=new KJ,HW=new j0;HW.set(-1,0,0,0,1,0,0,0,1);function CN(J,Q){function $(F,E){if(F.matrixAutoUpdate===!0)F.updateMatrix();E.value.copy(F.matrix)}function Z(F,E){if(E.color.getRGB(F.fogColor.value,oQ(J)),E.isFog)F.fogNear.value=E.near,F.fogFar.value=E.far;else if(E.isFogExp2)F.fogDensity.value=E.density}function K(F,E,A,_,V){if(E.isNodeMaterial)E.uniformsNeedUpdate=!1;else if(E.isMeshBasicMaterial)W(F,E);else if(E.isMeshLambertMaterial){if(W(F,E),E.envMap)F.envMapIntensity.value=E.envMapIntensity}else if(E.isMeshToonMaterial)W(F,E),q(F,E);else if(E.isMeshPhongMaterial){if(W(F,E),N(F,E),E.envMap)F.envMapIntensity.value=E.envMapIntensity}else if(E.isMeshStandardMaterial){if(W(F,E),G(F,E),E.isMeshPhysicalMaterial)D(F,E,V)}else if(E.isMeshMatcapMaterial)W(F,E),M(F,E);else if(E.isMeshDepthMaterial)W(F,E);else if(E.isMeshDistanceMaterial)W(F,E),I(F,E);else if(E.isMeshNormalMaterial)W(F,E);else if(E.isLineBasicMaterial){if(H(F,E),E.isLineDashedMaterial)Y(F,E)}else if(E.isPointsMaterial)X(F,E,A,_);else if(E.isSpriteMaterial)U(F,E);else if(E.isShadowMaterial)F.color.value.copy(E.color),F.opacity.value=E.opacity;else if(E.isShaderMaterial)E.uniformsNeedUpdate=!1}function W(F,E){if(F.opacity.value=E.opacity,E.color)F.diffuse.value.copy(E.color);if(E.emissive)F.emissive.value.copy(E.emissive).multiplyScalar(E.emissiveIntensity);if(E.map)F.map.value=E.map,$(E.map,F.mapTransform);if(E.alphaMap)F.alphaMap.value=E.alphaMap,$(E.alphaMap,F.alphaMapTransform);if(E.bumpMap){if(F.bumpMap.value=E.bumpMap,$(E.bumpMap,F.bumpMapTransform),F.bumpScale.value=E.bumpScale,E.side===bJ)F.bumpScale.value*=-1}if(E.normalMap){if(F.normalMap.value=E.normalMap,$(E.normalMap,F.normalMapTransform),F.normalScale.value.copy(E.normalScale),E.side===bJ)F.normalScale.value.negate()}if(E.displacementMap)F.displacementMap.value=E.displacementMap,$(E.displacementMap,F.displacementMapTransform),F.displacementScale.value=E.displacementScale,F.displacementBias.value=E.displacementBias;if(E.emissiveMap)F.emissiveMap.value=E.emissiveMap,$(E.emissiveMap,F.emissiveMapTransform);if(E.specularMap)F.specularMap.value=E.specularMap,$(E.specularMap,F.specularMapTransform);if(E.alphaTest>0)F.alphaTest.value=E.alphaTest;let A=Q.get(E),_=A.envMap,V=A.envMapRotation;if(_){if(F.envMap.value=_,F.envMapRotation.value.setFromMatrix4(AN.makeRotationFromEuler(V)).transpose(),_.isCubeTexture&&_.isRenderTargetTexture===!1)F.envMapRotation.value.premultiply(HW);F.reflectivity.value=E.reflectivity,F.ior.value=E.ior,F.refractionRatio.value=E.refractionRatio}if(E.lightMap)F.lightMap.value=E.lightMap,F.lightMapIntensity.value=E.lightMapIntensity,$(E.lightMap,F.lightMapTransform);if(E.aoMap)F.aoMap.value=E.aoMap,F.aoMapIntensity.value=E.aoMapIntensity,$(E.aoMap,F.aoMapTransform)}function H(F,E){if(F.diffuse.value.copy(E.color),F.opacity.value=E.opacity,E.map)F.map.value=E.map,$(E.map,F.mapTransform)}function Y(F,E){F.dashSize.value=E.dashSize,F.totalSize.value=E.dashSize+E.gapSize,F.scale.value=E.scale}function X(F,E,A,_){if(F.diffuse.value.copy(E.color),F.opacity.value=E.opacity,F.size.value=E.size*A,F.scale.value=_*0.5,E.map)F.map.value=E.map,$(E.map,F.uvTransform);if(E.alphaMap)F.alphaMap.value=E.alphaMap,$(E.alphaMap,F.alphaMapTransform);if(E.alphaTest>0)F.alphaTest.value=E.alphaTest}function U(F,E){if(F.diffuse.value.copy(E.color),F.opacity.value=E.opacity,F.rotation.value=E.rotation,E.map)F.map.value=E.map,$(E.map,F.mapTransform);if(E.alphaMap)F.alphaMap.value=E.alphaMap,$(E.alphaMap,F.alphaMapTransform);if(E.alphaTest>0)F.alphaTest.value=E.alphaTest}function N(F,E){F.specular.value.copy(E.specular),F.shininess.value=Math.max(E.shininess,0.0001)}function q(F,E){if(E.gradientMap)F.gradientMap.value=E.gradientMap}function G(F,E){if(F.metalness.value=E.metalness,E.metalnessMap)F.metalnessMap.value=E.metalnessMap,$(E.metalnessMap,F.metalnessMapTransform);if(F.roughness.value=E.roughness,E.roughnessMap)F.roughnessMap.value=E.roughnessMap,$(E.roughnessMap,F.roughnessMapTransform);if(E.envMap)F.envMapIntensity.value=E.envMapIntensity}function D(F,E,A){if(F.ior.value=E.ior,E.sheen>0){if(F.sheenColor.value.copy(E.sheenColor).multiplyScalar(E.sheen),F.sheenRoughness.value=E.sheenRoughness,E.sheenColorMap)F.sheenColorMap.value=E.sheenColorMap,$(E.sheenColorMap,F.sheenColorMapTransform);if(E.sheenRoughnessMap)F.sheenRoughnessMap.value=E.sheenRoughnessMap,$(E.sheenRoughnessMap,F.sheenRoughnessMapTransform)}if(E.clearcoat>0){if(F.clearcoat.value=E.clearcoat,F.clearcoatRoughness.value=E.clearcoatRoughness,E.clearcoatMap)F.clearcoatMap.value=E.clearcoatMap,$(E.clearcoatMap,F.clearcoatMapTransform);if(E.clearcoatRoughnessMap)F.clearcoatRoughnessMap.value=E.clearcoatRoughnessMap,$(E.clearcoatRoughnessMap,F.clearcoatRoughnessMapTransform);if(E.clearcoatNormalMap){if(F.clearcoatNormalMap.value=E.clearcoatNormalMap,$(E.clearcoatNormalMap,F.clearcoatNormalMapTransform),F.clearcoatNormalScale.value.copy(E.clearcoatNormalScale),E.side===bJ)F.clearcoatNormalScale.value.negate()}}if(E.dispersion>0)F.dispersion.value=E.dispersion;if(E.retroreflectivity>0)F.retroreflectivity.value=E.retroreflectivity;if(E.iridescence>0){if(F.iridescence.value=E.iridescence,F.iridescenceIOR.value=E.iridescenceIOR,F.iridescenceThicknessMinimum.value=E.iridescenceThicknessRange[0],F.iridescenceThicknessMaximum.value=E.iridescenceThicknessRange[1],E.iridescenceMap)F.iridescenceMap.value=E.iridescenceMap,$(E.iridescenceMap,F.iridescenceMapTransform);if(E.iridescenceThicknessMap)F.iridescenceThicknessMap.value=E.iridescenceThicknessMap,$(E.iridescenceThicknessMap,F.iridescenceThicknessMapTransform)}if(E.transmission>0){if(F.transmission.value=E.transmission,F.transmissionSamplerMap.value=A.texture,F.transmissionSamplerSize.value.set(A.width,A.height),E.transmissionMap)F.transmissionMap.value=E.transmissionMap,$(E.transmissionMap,F.transmissionMapTransform);if(F.thickness.value=E.thickness,E.thicknessMap)F.thicknessMap.value=E.thicknessMap,$(E.thicknessMap,F.thicknessMapTransform);F.attenuationDistance.value=E.attenuationDistance,F.attenuationColor.value.copy(E.attenuationColor)}if(E.anisotropy>0){if(F.anisotropyVector.value.set(E.anisotropy*Math.cos(E.anisotropyRotation),E.anisotropy*Math.sin(E.anisotropyRotation)),E.anisotropyMap)F.anisotropyMap.value=E.anisotropyMap,$(E.anisotropyMap,F.anisotropyMapTransform)}if(F.specularIntensity.value=E.specularIntensity,F.specularColor.value.copy(E.specularColor),E.specularColorMap)F.specularColorMap.value=E.specularColorMap,$(E.specularColorMap,F.specularColorMapTransform);if(E.specularIntensityMap)F.specularIntensityMap.value=E.specularIntensityMap,$(E.specularIntensityMap,F.specularIntensityMapTransform)}function M(F,E){if(E.matcap)F.matcap.value=E.matcap}function I(F,E){let A=Q.get(E).light;F.referencePosition.value.setFromMatrixPosition(A.matrixWorld),F.nearDistance.value=A.shadow.camera.near,F.farDistance.value=A.shadow.camera.far}return{refreshFogUniforms:Z,refreshMaterialUniforms:K}}function PN(J,Q,$,Z){let K={},W={},H=[],Y=J.getParameter(J.MAX_UNIFORM_BUFFER_BINDINGS);function X(V,z){let C=z.program;Z.uniformBlockBinding(V,C)}function U(V,z){let C=K[V.id];if(C===void 0)F(V),C=N(V),K[V.id]=C,V.addEventListener("dispose",A);let P=z.program;Z.updateUBOMapping(V,P);let L=Q.render.frame;if(W[V.id]!==L)G(V),W[V.id]=L}function N(V){let z=q();V.__bindingPointIndex=z;let C=J.createBuffer(),P=V.__size,L=V.usage;return J.bindBuffer(J.UNIFORM_BUFFER,C),J.bufferData(J.UNIFORM_BUFFER,P,L),J.bindBuffer(J.UNIFORM_BUFFER,null),J.bindBufferBase(J.UNIFORM_BUFFER,z,C),C}function q(){for(let V=0;V<Y;V++)if(H.indexOf(V)===-1)return H.push(V),V;return S0("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function G(V){let z=K[V.id],C=V.uniforms,P=V.__cache;J.bindBuffer(J.UNIFORM_BUFFER,z);for(let L=0,B=C.length;L<B;L++){let l=C[L];if(Array.isArray(l))for(let v=0,h=l.length;v<h;v++)D(l[v],L,v,P);else D(l,L,0,P)}J.bindBuffer(J.UNIFORM_BUFFER,null)}function D(V,z,C,P){if(I(V,z,C,P)===!0){let{__offset:L,value:B}=V;if(Array.isArray(B)){let l=0;for(let v=0;v<B.length;v++){let h=B[v],r=E(h);if(M(h,V.__data,l),typeof h!=="number"&&typeof h!=="boolean"&&!h.isMatrix3&&!ArrayBuffer.isView(h))l+=r.storage/Float32Array.BYTES_PER_ELEMENT}}else M(B,V.__data,0);J.bufferSubData(J.UNIFORM_BUFFER,L,V.__data)}}function M(V,z,C){if(typeof V==="number"||typeof V==="boolean")z[0]=V;else if(V.isMatrix3)z[0]=V.elements[0],z[1]=V.elements[1],z[2]=V.elements[2],z[3]=0,z[4]=V.elements[3],z[5]=V.elements[4],z[6]=V.elements[5],z[7]=0,z[8]=V.elements[6],z[9]=V.elements[7],z[10]=V.elements[8],z[11]=0;else if(ArrayBuffer.isView(V))z.set(new V.constructor(V.buffer,V.byteOffset,z.length));else V.toArray(z,C)}function I(V,z,C,P){let L=V.value,B=z+"_"+C;if(P[B]===void 0){if(typeof L==="number"||typeof L==="boolean")P[B]=L;else if(ArrayBuffer.isView(L))P[B]=L.slice();else P[B]=L.clone();return!0}else{let l=P[B];if(typeof L==="number"||typeof L==="boolean"){if(l!==L)return P[B]=L,!0}else if(ArrayBuffer.isView(L))return!0;else if(l.equals(L)===!1)return l.copy(L),!0}return!1}function F(V){let z=V.uniforms,C=0,P=16;for(let B=0,l=z.length;B<l;B++){let v=Array.isArray(z[B])?z[B]:[z[B]];for(let h=0,r=v.length;h<r;h++){let j=v[h],d=Array.isArray(j.value)?j.value:[j.value];for(let o=0,m=d.length;o<m;o++){let Q0=d[o],c=E(Q0),a=C%P,J0=a%c.boundary,_0=a+J0;if(C+=J0,_0!==0&&P-_0<c.storage)C+=P-_0;j.__data=new Float32Array(c.storage/Float32Array.BYTES_PER_ELEMENT),j.__offset=C,C+=c.storage}}}let L=C%P;if(L>0)C+=P-L;return V.__size=C,V.__cache={},this}function E(V){let z={boundary:0,storage:0};if(typeof V==="number"||typeof V==="boolean")z.boundary=4,z.storage=4;else if(V.isVector2)z.boundary=8,z.storage=8;else if(V.isVector3||V.isColor)z.boundary=16,z.storage=12;else if(V.isVector4)z.boundary=16,z.storage=16;else if(V.isMatrix3)z.boundary=48,z.storage=48;else if(V.isMatrix4)z.boundary=64,z.storage=64;else if(V.isTexture)P0("WebGLRenderer: Texture samplers can not be part of an uniforms group.");else if(ArrayBuffer.isView(V))z.boundary=16,z.storage=V.byteLength;else P0("WebGLRenderer: Unsupported uniform value type.",V);return z}function A(V){let z=V.target;z.removeEventListener("dispose",A);let C=H.indexOf(z.__bindingPointIndex);H.splice(C,1),J.deleteBuffer(K[z.id]),delete K[z.id],delete W[z.id]}function _(){for(let V in K)J.deleteBuffer(K[V]);H=[],K={},W={}}return{bind:X,update:U,dispose:_}}var wN=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),R9=null;function _N(){if(R9===null)R9=new sQ(wN,16,16,J8,F9),R9.name="DFG_LUT",R9.minFilter=xJ,R9.magFilter=xJ,R9.wrapS=d7,R9.wrapT=d7,R9.generateMipmaps=!1,R9.needsUpdate=!0;return R9}class A${constructor(J={}){let{canvas:Q=RK(),context:$=null,depth:Z=!0,stencil:K=!1,alpha:W=!1,antialias:H=!1,premultipliedAlpha:Y=!0,preserveDrawingBuffer:X=!1,powerPreference:U="default",failIfMajorPerformanceCaveat:N=!1,reversedDepthBuffer:q=!1,outputBufferType:G=Y9}=J;this.isWebGLRenderer=!0;let D;if($!==null){if(typeof WebGLRenderingContext<"u"&&$ instanceof WebGLRenderingContext)throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");D=$.getContextAttributes().alpha}else D=W;let M=G,I=new Set([WQ,KQ,ZQ]),F=new Set([Y9,m9,H7,b8,QQ,$Q]),E=new Uint32Array(4),A=new Int32Array(4),_=new f,V=null,z=null,C=[],P=[],L=null;this.domElement=Q,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=H9,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let B=this,l=!1,v=null,h=null,r=null,j=null;this._outputColorSpace=GK;let d=0,o=0,m=null,Q0=-1,c=null,a=new UJ,J0=new UJ,_0=null,z0=new g0(0),QJ=0,h0=Q.width,n=Q.height,$0=1,K0=null,A0=null,T0=new UJ(0,0,h0,n),B0=new UJ(0,0,h0,n),FJ=!1,p0=new Z6,l0=!1,o0=!1,d0=new KJ,BJ=new f,HJ=new UJ,vJ={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},DJ=!1;function OJ(){return m===null?$0:1}let T=$;function hJ(R,S){return Q.getContext(R,S)}let n0,XJ,k,O,w,g,e,W0,X0,u,i,F0,V0,U0,Z0,I0,C0,c0,y,H0,s,Y0,D0;try{let R={alpha:!0,depth:Z,stencil:K,antialias:H,premultipliedAlpha:Y,preserveDrawingBuffer:X,powerPreference:U,failIfMajorPerformanceCaveat:N};if("setAttribute"in Q)Q.setAttribute("data-engine",`three.js r${LZ}`);if(Q.addEventListener("webglcontextlost",y0,!1),Q.addEventListener("webglcontextrestored",$J,!1),Q.addEventListener("webglcontextcreationerror",s0,!1),T===null){if(T=hJ("webgl2",R),T===null)if(hJ("webgl2"))throw Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.");else throw Error("THREE.WebGLRenderer: Error creating WebGL context.")}t()}catch(R){throw Q.removeEventListener("webglcontextlost",y0,!1),Q.removeEventListener("webglcontextrestored",$J,!1),Q.removeEventListener("webglcontextcreationerror",s0,!1),S0("WebGLRenderer: "+R.message),R}function t(){if(n0=new hU(T),n0.init(),s=new BN(T,n0),XJ=new CU(T,n0,J,s),k=new kN(T,n0),XJ.reversedDepthBuffer&&q)k.buffers.depth.setReversed(!0);h=T.createFramebuffer(),r=T.createFramebuffer(),j=T.createFramebuffer(),O=new gU(T),w=new HN,g=new VN(T,n0,k,w,XJ,s,O),e=new vU(B),W0=new mH(T),Y0=new zU(T,W0),X0=new bU(T,W0,O,Y0),u=new mU(T,X0,W0,Y0,O),c0=new pU(T,XJ,g),Z0=new PU(w),i=new WN(B,e,n0,XJ,Y0,Z0),F0=new CN(B,w),V0=new XN,U0=new FN(n0),C0=new IU(B,e,k,u,D,Y),I0=new LN(B,u,XJ),D0=new PN(T,O,XJ,k),y=new AU(T,n0,O),H0=new xU(T,n0,O),O.programs=i.programs,B.capabilities=XJ,B.extensions=n0,B.properties=w,B.renderLists=V0,B.shadowMap=I0,B.state=k,B.info=O}if(M!==Y9)L=new dU(M,Q.width,Q.height,H,Z,K);let N0=new WW(B,T);this.xr=N0,this.getContext=function(){return T},this.getContextAttributes=function(){return T.getContextAttributes()},this.forceContextLoss=function(){let R=n0.get("WEBGL_lose_context");if(R)R.loseContext()},this.forceContextRestore=function(){let R=n0.get("WEBGL_lose_context");if(R)R.restoreContext()},this.getPixelRatio=function(){return $0},this.setPixelRatio=function(R){if(R===void 0)return;$0=R,this.setSize(h0,n,!1)},this.getSize=function(R){return R.set(h0,n)},this.setSize=function(R,S,p=!0){if(N0.isPresenting){P0("WebGLRenderer: Can't change size while VR device is presenting.");return}if(h0=R,n=S,Q.width=Math.floor(R*$0),Q.height=Math.floor(S*$0),p===!0)Q.style.width=R+"px",Q.style.height=S+"px";if(L!==null)L.setSize(Q.width,Q.height);this.setViewport(0,0,R,S)},this.getDrawingBufferSize=function(R){return R.set(h0*$0,n*$0).floor()},this.setDrawingBufferSize=function(R,S,p){h0=R,n=S,$0=p,Q.width=Math.floor(R*p),Q.height=Math.floor(S*p),this.setViewport(0,0,R,S)},this.setEffects=function(R){if(M===Y9){S0("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(R){for(let S=0;S<R.length;S++)if(R[S].isOutputPass===!0){P0("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}L.setEffects(R||[])},this.getCurrentViewport=function(R){return R.copy(a)},this.getViewport=function(R){return R.copy(T0)},this.setViewport=function(R,S,p,b){if(R.isVector4)T0.set(R.x,R.y,R.z,R.w);else T0.set(R,S,p,b);k.viewport(a.copy(T0).multiplyScalar($0).round())},this.getScissor=function(R){return R.copy(B0)},this.setScissor=function(R,S,p,b){if(R.isVector4)B0.set(R.x,R.y,R.z,R.w);else B0.set(R,S,p,b);k.scissor(J0.copy(B0).multiplyScalar($0).round())},this.getScissorTest=function(){return FJ},this.setScissorTest=function(R){k.setScissorTest(FJ=R)},this.setOpaqueSort=function(R){K0=R},this.setTransparentSort=function(R){A0=R},this.getClearColor=function(R){return R.copy(C0.getClearColor())},this.setClearColor=function(){C0.setClearColor(...arguments)},this.getClearAlpha=function(){return C0.getClearAlpha()},this.setClearAlpha=function(){C0.setClearAlpha(...arguments)},this.clear=function(R=!0,S=!0,p=!0){let b=0;if(R){let x=!1;if(m!==null){let E0=m.texture.format;x=I.has(E0)}if(x){let E0=m.texture.type,R0=F.has(E0),q0=C0.getClearColor(),M0=C0.getClearAlpha(),k0=q0.r,f0=q0.g,x0=q0.b;if(R0)E[0]=k0,E[1]=f0,E[2]=x0,E[3]=M0,T.clearBufferuiv(T.COLOR,0,E);else A[0]=k0,A[1]=f0,A[2]=x0,A[3]=M0,T.clearBufferiv(T.COLOR,0,A)}else b|=T.COLOR_BUFFER_BIT}if(S)b|=T.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0);if(p)b|=T.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295);if(b!==0)T.clear(b)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(R){R.setRenderer(this),v=R},this.dispose=function(){Q.removeEventListener("webglcontextlost",y0,!1),Q.removeEventListener("webglcontextrestored",$J,!1),Q.removeEventListener("webglcontextcreationerror",s0,!1),C0.dispose(),V0.dispose(),U0.dispose(),w.dispose(),e.dispose(),u.dispose(),Y0.dispose(),D0.dispose(),i.dispose(),N0.dispose(),N0.removeEventListener("sessionstart",l$),N0.removeEventListener("sessionend",d$),u9.stop()};function y0(R){R.preventDefault(),mQ("WebGLRenderer: Context Lost."),l=!0}function $J(){mQ("WebGLRenderer: Context Restored."),l=!1;let R=O.autoReset,S=I0.enabled,p=I0.autoUpdate,b=I0.needsUpdate,x=I0.type;t(),O.autoReset=R,I0.enabled=S,I0.autoUpdate=p,I0.needsUpdate=b,I0.type=x}function s0(R){S0("WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function G9(R){let S=R.target;S.removeEventListener("dispose",G9),k9(S)}function k9(R){gW(R),w.remove(R)}function gW(R){let S=w.get(R).programs;if(S!==void 0){if(S.forEach(function(p){i.releaseProgram(p)}),R.isShaderMaterial)i.releaseShaderCache(R)}}this.renderBufferDirect=function(R,S,p,b,x,E0){if(S===null)S=vJ;let R0=x.isMesh&&x.matrixWorld.determinantAffine()<0,q0=lW(R,S,p,b,x);k.setMaterial(b,R0);let M0=p.index,k0=1;if(b.wireframe===!0){if(M0=X0.getWireframeAttribute(p),M0===void 0)return;k0=2}let f0=p.drawRange,x0=p.attributes.position,L0=f0.start*k0,i0=(f0.start+f0.count)*k0;if(E0!==null)L0=Math.max(L0,E0.start*k0),i0=Math.min(i0,(E0.start+E0.count)*k0);if(M0!==null)L0=Math.max(L0,0),i0=Math.min(i0,M0.count);else if(x0!==void 0&&x0!==null)L0=Math.max(L0,0),i0=Math.min(i0,x0.count);let NJ=i0-L0;if(NJ<0||NJ===1/0)return;Y0.setup(x,b,q0,p,M0);let YJ,e0=y;if(M0!==null)YJ=W0.get(M0),e0=H0,e0.setIndex(YJ);if(x.isMesh)if(b.wireframe===!0)k.setLineWidth(b.wireframeLinewidth*OJ()),e0.setMode(T.LINES);else e0.setMode(T.TRIANGLES);else if(x.isLine){let AJ=b.linewidth;if(AJ===void 0)AJ=1;if(k.setLineWidth(AJ*OJ()),x.isLineSegments)e0.setMode(T.LINES);else if(x.isLineLoop)e0.setMode(T.LINE_LOOP);else e0.setMode(T.LINE_STRIP)}else if(x.isPoints)e0.setMode(T.POINTS);else if(x.isSprite)e0.setMode(T.TRIANGLES);if(x.isBatchedMesh)if(!n0.get("WEBGL_multi_draw")){let{_multiDrawStarts:AJ,_multiDrawCounts:O0,_multiDrawCount:jJ}=x,u0=M0?W0.get(M0).bytesPerElement:1,sJ=w.get(b).currentProgram.getUniforms();for(let N9=0;N9<jJ;N9++)sJ.setValue(T,"_gl_DrawID",N9),e0.render(AJ[N9]/u0,O0[N9])}else e0.renderMultiDraw(x._multiDrawStarts,x._multiDrawCounts,x._multiDrawCount);else if(x.isInstancedMesh)e0.renderInstances(L0,NJ,x.count);else if(p.isInstancedBufferGeometry){let AJ=p._maxInstanceCount!==void 0?p._maxInstanceCount:1/0,O0=Math.min(p.instanceCount,AJ);e0.renderInstances(L0,NJ,O0)}else e0.render(L0,NJ)};function m$(R,S,p,b){if(v!==null&&R.isNodeMaterial)v.setObject(b,R);if(l0===!0)Z0.setState(R,p,!1);if(R.transparent===!0&&R.side===rJ&&R.forceSinglePass===!1)R.side=bJ,R.needsUpdate=!0,V7(R,S,b),R.side=f8,R.needsUpdate=!0,V7(R,S,b),R.side=rJ;else V7(R,S,b)}this.compile=function(R,S,p=null){if(p===null)p=R;if(v!==null)v.renderStart(R,S,p);if(z=U0.get(p),z.init(S),P.push(z),p.traverseVisible(function(x){if(x.isLight&&x.layers.test(S.layers)){if(z.pushLight(x),x.castShadow)z.pushShadow(x)}}),R!==p)R.traverseVisible(function(x){if(x.isLight&&x.layers.test(S.layers)){if(z.pushLight(x),x.castShadow)z.pushShadow(x)}});if(z.setupLights(),v!==null)v.updateLights(z.state.lightsArray);if(o0=this.localClippingEnabled,l0=Z0.init(this.clippingPlanes,o0),l0===!0)Z0.setGlobalState(this.clippingPlanes,S);if(v!==null)I0.render(z.state.shadowsArray,p,S);let b=new Set;if(R.traverse(function(x){if(!(x.isMesh||x.isPoints||x.isLine||x.isSprite))return;let E0=x.material;if(E0)if(Array.isArray(E0))for(let R0=0;R0<E0.length;R0++){let q0=E0[R0];m$(q0,p,S,x),b.add(q0)}else m$(E0,p,S,x),b.add(E0)}),z=P.pop(),v!==null)v.renderEnd();return b},this.compileAsync=function(R,S,p=null){let b=this.compile(R,S,p);return new Promise((x)=>{function E0(){if(b.forEach(function(R0){let M0=w.get(R0).currentProgram;if(M0===void 0||M0.isReady())b.delete(R0)}),b.size===0){x(R);return}setTimeout(E0,10)}if(n0.get("KHR_parallel_shader_compile")!==null)E0();else setTimeout(E0,10)})};let L6=null;function pW(R){if(L6)L6(R)}function l$(){u9.stop()}function d$(){u9.start()}let u9=new sK;if(u9.setAnimationLoop(pW),typeof self<"u")u9.setContext(self);this.setAnimationLoop=function(R){L6=R,N0.setAnimationLoop(R),R===null?u9.stop():u9.start()},N0.addEventListener("sessionstart",l$),N0.addEventListener("sessionend",d$),this.render=function(R,S){if(S!==void 0&&S.isCamera!==!0){S0("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(l===!0)return;if(v!==null)v.renderStart(R,S);let p=N0.enabled===!0&&N0.isPresenting===!0,b=L!==null&&(m===null||p)&&L.begin(B,m);if(R.matrixWorldAutoUpdate===!0)R.updateMatrixWorld();if(S.parent===null&&S.matrixWorldAutoUpdate===!0)S.updateMatrixWorld();if(N0.enabled===!0&&N0.isPresenting===!0&&(L===null||L.isCompositing()===!1)){if(N0.cameraAutoUpdate===!0)N0.updateCamera(S);S=N0.getCamera()}if(R.isScene===!0)R.onBeforeRender(B,R,S,m);if(z=U0.get(R,P.length),z.init(S),z.state.textureUnits=g.getTextureUnits(),P.push(z),d0.multiplyMatrices(S.projectionMatrix,S.matrixWorldInverse),p0.setFromProjectionMatrix(d0,pQ,S.reversedDepth),o0=this.localClippingEnabled,l0=Z0.init(this.clippingPlanes,o0),V=V0.get(R,C.length),V.init(),C.push(V),N0.enabled===!0&&N0.isPresenting===!0){let R0=B.xr.getDepthSensingMesh();if(R0!==null)k6(R0,S,-1/0,B.sortObjects)}if(k6(R,S,0,B.sortObjects),V.finish(),v!==null)v.updateLights(z.state.lightsArray);if(B.sortObjects===!0)V.sort(K0,A0);if(DJ=N0.enabled===!1||N0.isPresenting===!1||N0.hasDepthSensing()===!1,DJ)C0.addToRenderList(V,R);if(this.info.render.frame++,this.info.autoReset===!0)this.info.reset();if(l0===!0)Z0.beginShadows();let x=z.state.shadowsArray;if(I0.render(x,R,S),l0===!0)Z0.endShadows();if((b&&L.hasRenderPass())===!1){let{opaque:R0,transmissive:q0}=V;if(z.setupLights(),S.isArrayCamera){let M0=S.cameras;if(q0.length>0)for(let k0=0,f0=M0.length;k0<f0;k0++){let x0=M0[k0];c$(R0,q0,R,x0)}if(DJ)C0.render(R);for(let k0=0,f0=M0.length;k0<f0;k0++){let x0=M0[k0];u$(V,R,x0,x0.viewport)}}else{if(q0.length>0)c$(R0,q0,R,S);if(DJ)C0.render(R);u$(V,R,S)}}if(m!==null&&o===0)g.updateMultisampleRenderTarget(m),g.updateRenderTargetMipmap(m);if(b)L.end(B);if(R.isScene===!0)R.onAfterRender(B,R,S);if(Y0.resetDefaultState(),Q0=-1,c=null,P.pop(),P.length>0){if(z=P[P.length-1],g.setTextureUnits(z.state.textureUnits),l0===!0)Z0.setGlobalState(B.clippingPlanes,z.state.camera)}else z=null;if(C.pop(),C.length>0)V=C[C.length-1];else V=null;if(v!==null)v.renderEnd()};function k6(R,S,p,b){if(R.visible===!1)return;if(R.layers.test(S.layers)){if(R.isGroup)p=R.renderOrder;else if(R.isLOD){if(R.autoUpdate===!0)R.update(S)}else if(R.isLightProbeGrid)z.pushLightProbeGrid(R);else if(R.isLight){if(z.pushLight(R),R.castShadow)z.pushShadow(R)}else if(R.isSprite){if(!R.frustumCulled||R.intersectsFrustum(p0)){if(b)HJ.setFromMatrixPosition(R.matrixWorld).applyMatrix4(d0);let R0=u.update(R),q0=R.material;if(q0.visible)V.push(R,R0,q0,p,HJ.z,null,S)}}else if(R.isMesh||R.isLine||R.isPoints){if(!R.frustumCulled||R.intersectsFrustum(p0)){let R0=u.update(R),q0=R.material;if(b){if(R.boundingSphere!==void 0){if(R.boundingSphere===null)R.computeBoundingSphere();HJ.copy(R.boundingSphere.center)}else{if(R0.boundingSphere===null)R0.computeBoundingSphere();HJ.copy(R0.boundingSphere.center)}HJ.applyMatrix4(R.matrixWorld).applyMatrix4(d0)}if(Array.isArray(q0)){let M0=R0.groups;for(let k0=0,f0=M0.length;k0<f0;k0++){let x0=M0[k0],L0=q0[x0.materialIndex];if(L0&&L0.visible)V.push(R,R0,L0,p,HJ.z,x0,S)}}else if(q0.visible)V.push(R,R0,q0,p,HJ.z,null,S)}}}let E0=R.children;for(let R0=0,q0=E0.length;R0<q0;R0++)k6(E0[R0],S,p,b)}function u$(R,S,p,b){let{opaque:x,transmissive:E0,transparent:R0}=R;if(z.setupLightsView(p),l0===!0)Z0.setGlobalState(B.clippingPlanes,p);if(b)k.viewport(a.copy(b));if(x.length>0)k7(x,S,p);if(E0.length>0)k7(E0,S,p);if(R0.length>0)k7(R0,S,p);k.buffers.depth.setTest(!0),k.buffers.depth.setMask(!0),k.buffers.color.setMask(!0),k.setPolygonOffset(!1)}function c$(R,S,p,b){if((p.isScene===!0?p.overrideMaterial:null)!==null)return;if(z.state.transmissionRenderTarget[b.id]===void 0){let L0=n0.has("EXT_color_buffer_half_float")||n0.has("EXT_color_buffer_float");z.state.transmissionRenderTarget[b.id]=new cJ(1,1,{generateMipmaps:!0,type:L0?F9:Y9,minFilter:r9,samples:Math.max(4,XJ.samples),stencilBuffer:K,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:m0.workingColorSpace})}let E0=z.state.transmissionRenderTarget[b.id],R0=b.viewport||a;E0.setSize(R0.z*B.transmissionResolutionScale,R0.w*B.transmissionResolutionScale);let q0=B.getRenderTarget(),M0=B.getActiveCubeFace(),k0=B.getActiveMipmapLevel();if(B.setRenderTarget(E0),B.getClearColor(z0),QJ=B.getClearAlpha(),QJ<1)B.setClearColor(16777215,0.5);if(B.clear(),DJ)C0.render(p);let f0=B.toneMapping;B.toneMapping=H9;let x0=b.viewport;if(b.viewport!==void 0)b.viewport=void 0;if(z.setupLightsView(b),l0===!0)Z0.setGlobalState(B.clippingPlanes,b);if(k7(R,p,b),g.updateMultisampleRenderTarget(E0),g.updateRenderTargetMipmap(E0),n0.has("WEBGL_multisampled_render_to_texture")===!1){let L0=!1;for(let i0=0,NJ=S.length;i0<NJ;i0++){let YJ=S[i0],{object:e0,geometry:AJ,material:O0,group:jJ}=YJ;if(O0.side===rJ&&e0.layers.test(b.layers)){let u0=O0.side;O0.side=bJ,O0.needsUpdate=!0,n$(e0,p,b,AJ,O0,jJ),O0.side=u0,O0.needsUpdate=!0,L0=!0}}if(L0===!0)g.updateMultisampleRenderTarget(E0),g.updateRenderTargetMipmap(E0)}if(B.setRenderTarget(q0,M0,k0),B.setClearColor(z0,QJ),x0!==void 0)b.viewport=x0;B.toneMapping=f0}function k7(R,S,p){let b=S.isScene===!0?S.overrideMaterial:null;for(let x=0,E0=R.length;x<E0;x++){let R0=R[x],{object:q0,geometry:M0,group:k0}=R0,f0=R0.material;if(f0.allowOverride===!0&&b!==null)f0=b;if(q0.layers.test(p.layers))n$(q0,S,p,M0,f0,k0)}}function n$(R,S,p,b,x,E0){if(v!==null&&x.isNodeMaterial)v.setObject(R,x);if(R.onBeforeRender(B,S,p,b,x,E0),R.modelViewMatrix.multiplyMatrices(p.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),x.onBeforeRender(B,S,p,b,R,E0),x.transparent===!0&&x.side===rJ&&x.forceSinglePass===!1)x.side=bJ,x.needsUpdate=!0,B.renderBufferDirect(p,S,b,x,R,E0),x.side=f8,x.needsUpdate=!0,B.renderBufferDirect(p,S,b,x,R,E0),x.side=rJ;else B.renderBufferDirect(p,S,b,x,R,E0);R.onAfterRender(B,S,p,b,x,E0)}function V7(R,S,p){if(S.isScene!==!0)S=vJ;let b=w.get(R),x=z.state.lights,E0=z.state.shadowsArray,R0=x.state.version,q0=i.getParameters(R,x.state,E0,S,p,z.state.lightProbeGridArray),M0=i.getProgramCacheKey(q0),k0=b.programs;b.environment=R.isMeshStandardMaterial||R.isMeshLambertMaterial||R.isMeshPhongMaterial?S.environment:null,b.fog=S.fog;let f0=R.isMeshStandardMaterial||R.isMeshLambertMaterial&&!R.envMap||R.isMeshPhongMaterial&&!R.envMap;if(b.envMap=e.get(R.envMap||b.environment,f0),b.envMapRotation=b.environment!==null&&R.envMap===null?S.environmentRotation:R.envMapRotation,k0===void 0)R.addEventListener("dispose",G9),k0=new Map,b.programs=k0;let x0=k0.get(M0);if(x0!==void 0){if(b.currentProgram===x0&&b.lightsStateVersion===R0)return i$(R,q0),x0}else{if(q0.uniforms=i.getUniforms(R),v!==null&&R.isNodeMaterial)v.build(R,p,q0);R.onBeforeCompile(q0,B),x0=i.acquireProgram(q0,M0),k0.set(M0,x0),b.uniforms=q0.uniforms}let L0=b.uniforms;if(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)L0.clippingPlanes=Z0.uniform;if(i$(R,q0),b.needsLights=uW(R),b.lightsStateVersion=R0,b.needsLights)L0.ambientLightColor.value=x.state.ambient,L0.lightProbe.value=x.state.probe,L0.sunLights.value=x.state.sun,L0.sunLightShadows.value=x.state.sunShadow,L0.directionalLights.value=x.state.directional,L0.directionalLightShadows.value=x.state.directionalShadow,L0.spotLights.value=x.state.spot,L0.spotLightShadows.value=x.state.spotShadow,L0.rectAreaLights.value=x.state.rectArea,L0.ltc_1.value=x.state.rectAreaLTC1,L0.ltc_2.value=x.state.rectAreaLTC2,L0.pointLights.value=x.state.point,L0.pointLightShadows.value=x.state.pointShadow,L0.hemisphereLights.value=x.state.hemi,L0.sunShadowMatrix.value=x.state.sunShadowMatrix,L0.sunShadowCascade.value=x.state.sunShadowCascade,L0.directionalShadowMatrix.value=x.state.directionalShadowMatrix,L0.spotLightMatrix.value=x.state.spotLightMatrix,L0.spotLightMap.value=x.state.spotLightMap,L0.pointShadowMatrix.value=x.state.pointShadowMatrix;return b.lightProbeGrid=z.state.lightProbeGridArray.length>0,b.currentProgram=x0,b.uniformsList=null,x0}function s$(R){if(R.uniformsList===null){let S=R.currentProgram.getUniforms();R.uniformsList=O7.seqWithValue(S.seq,R.uniforms)}return R.uniformsList}function i$(R,S){let p=w.get(R);p.outputColorSpace=S.outputColorSpace,p.batching=S.batching,p.batchingColor=S.batchingColor,p.instancing=S.instancing,p.instancingColor=S.instancingColor,p.instancingMorph=S.instancingMorph,p.skinning=S.skinning,p.morphTargets=S.morphTargets,p.morphNormals=S.morphNormals,p.morphColors=S.morphColors,p.morphTargetsCount=S.morphTargetsCount,p.numClippingPlanes=S.numClippingPlanes,p.numIntersection=S.numClipIntersection,p.vertexAlphas=S.vertexAlphas,p.vertexTangents=S.vertexTangents,p.toneMapping=S.toneMapping}function mW(R,S){if(R.length===0)return null;if(R.length===1)return R[0].texture!==null?R[0]:null;_.setFromMatrixPosition(S.matrixWorld);for(let p=0,b=R.length;p<b;p++){let x=R[p];if(x.texture!==null&&x.boundingBox.containsPoint(_))return x}return null}function lW(R,S,p,b,x){if(S.isScene!==!0)S=vJ;g.resetTextureUnits();let E0=S.fog,R0=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?S.environment:null,q0=m===null?B.outputColorSpace:m.isXRRenderTarget===!0?m.texture.colorSpace:m0.workingColorSpace,M0=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap,k0=e.get(b.envMap||R0,M0),f0=b.vertexColors===!0&&!!p.attributes.color&&p.attributes.color.itemSize===4,x0=!!p.attributes.tangent&&(!!b.normalMap||b.anisotropy>0),L0=!!p.morphAttributes.position,i0=!!p.morphAttributes.normal,NJ=!!p.morphAttributes.color,YJ=H9;if(b.toneMapped){if(m===null||m.isXRRenderTarget===!0)YJ=B.toneMapping}let e0=p.morphAttributes.position||p.morphAttributes.normal||p.morphAttributes.color,AJ=e0!==void 0?e0.length:0,O0=w.get(b),jJ=z.state.lights;if(l0===!0){if(o0===!0||R!==c){let ZJ=R===c&&b.id===Q0;Z0.setState(b,R,ZJ)}}let u0=!1;if(b.version===O0.__version){if(O0.needsLights&&O0.lightsStateVersion!==jJ.state.version)u0=!0;else if(O0.outputColorSpace!==q0)u0=!0;else if(x.isBatchedMesh&&O0.batching===!1)u0=!0;else if(!x.isBatchedMesh&&O0.batching===!0)u0=!0;else if(x.isBatchedMesh&&O0.batchingColor===!0&&x._colorsTexture===null)u0=!0;else if(x.isBatchedMesh&&O0.batchingColor===!1&&x._colorsTexture!==null)u0=!0;else if(x.isInstancedMesh&&O0.instancing===!1)u0=!0;else if(!x.isInstancedMesh&&O0.instancing===!0)u0=!0;else if(x.isSkinnedMesh&&O0.skinning===!1)u0=!0;else if(!x.isSkinnedMesh&&O0.skinning===!0)u0=!0;else if(x.isInstancedMesh&&O0.instancingColor===!0&&x.instanceColor===null)u0=!0;else if(x.isInstancedMesh&&O0.instancingColor===!1&&x.instanceColor!==null)u0=!0;else if(x.isInstancedMesh&&O0.instancingMorph===!0&&x.morphTexture===null)u0=!0;else if(x.isInstancedMesh&&O0.instancingMorph===!1&&x.morphTexture!==null)u0=!0;else if(O0.envMap!==k0)u0=!0;else if(b.fog===!0&&O0.fog!==E0)u0=!0;else if(O0.numClippingPlanes!==void 0&&(O0.numClippingPlanes!==Z0.numPlanes||O0.numIntersection!==Z0.numIntersection))u0=!0;else if(O0.vertexAlphas!==f0)u0=!0;else if(O0.vertexTangents!==x0)u0=!0;else if(O0.morphTargets!==L0)u0=!0;else if(O0.morphNormals!==i0)u0=!0;else if(O0.morphColors!==NJ)u0=!0;else if(O0.toneMapping!==YJ)u0=!0;else if(O0.morphTargetsCount!==AJ)u0=!0;else if(!!O0.lightProbeGrid!==z.state.lightProbeGridArray.length>0)u0=!0}else u0=!0,O0.__version=b.version;let sJ=O0.currentProgram;if(u0===!0){if(sJ=V7(b,S,x),v&&b.isNodeMaterial)v.onUpdateProgram(b,sJ,O0)}let N9=!1,T9=!1,E8=!1,t0=sJ.getUniforms(),GJ=O0.uniforms;if(k.useProgram(sJ.program))N9=!0,T9=!0,E8=!0;if(b.id!==Q0)Q0=b.id,T9=!0;if(O0.needsLights){let ZJ=mW(z.state.lightProbeGridArray,x);if(O0.lightProbeGrid!==ZJ)O0.lightProbeGrid=ZJ,T9=!0}if(N9||c!==R){if(k.buffers.depth.getReversed()&&R.reversedDepth!==!0)R._reversedDepth=!0,R.updateProjectionMatrix();t0.setValue(T,"projectionMatrix",R.projectionMatrix),t0.setValue(T,"viewMatrix",R.matrixWorldInverse);let j9=t0.map.cameraPosition;if(j9!==void 0)j9.setValue(T,BJ.setFromMatrixPosition(R.matrixWorld));if(XJ.logarithmicDepthBuffer)t0.setValue(T,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2));if(b.isMeshPhongMaterial||b.isMeshToonMaterial||b.isMeshLambertMaterial||b.isMeshBasicMaterial||b.isMeshStandardMaterial||b.isShaderMaterial)t0.setValue(T,"isOrthographic",R.isOrthographicCamera===!0);if(c!==R)c=R,T9=!0,E8=!0}if(O0.needsLights){if(jJ.state.sunShadowMap.length>0)t0.setValue(T,"sunShadowMap",jJ.state.sunShadowMap,g);if(jJ.state.directionalShadowMap.length>0)t0.setValue(T,"directionalShadowMap",jJ.state.directionalShadowMap,g);if(jJ.state.spotShadowMap.length>0)t0.setValue(T,"spotShadowMap",jJ.state.spotShadowMap,g);if(jJ.state.pointShadowMap.length>0)t0.setValue(T,"pointShadowMap",jJ.state.pointShadowMap,g)}if(x.isSkinnedMesh){t0.setOptional(T,x,"bindMatrix"),t0.setOptional(T,x,"bindMatrixInverse");let ZJ=x.skeleton;if(ZJ){if(ZJ.boneTexture===null)ZJ.computeBoneTexture();t0.setValue(T,"boneTexture",ZJ.boneTexture,g)}}if(x.isBatchedMesh){if(t0.setOptional(T,x,"batchingTexture"),t0.setValue(T,"batchingTexture",x._matricesTexture,g),t0.setOptional(T,x,"batchingIdTexture"),t0.setValue(T,"batchingIdTexture",x._indirectTexture,g),t0.setOptional(T,x,"batchingColorTexture"),x._colorsTexture!==null)t0.setValue(T,"batchingColorTexture",x._colorsTexture,g)}let S9=p.morphAttributes;if(S9.position!==void 0||S9.normal!==void 0||S9.color!==void 0)c0.update(x,p,sJ);if(T9||O0.receiveShadow!==x.receiveShadow)O0.receiveShadow=x.receiveShadow,t0.setValue(T,"receiveShadow",x.receiveShadow);if((b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial)&&b.envMap===null&&S.environment!==null)GJ.envMapIntensity.value=S.environmentIntensity;if(GJ.dfgLUT!==void 0)GJ.dfgLUT.value=_N();if(T9){if(t0.setValue(T,"toneMappingExposure",B.toneMappingExposure),O0.needsLights)dW(GJ,E8);if(E0&&b.fog===!0)F0.refreshFogUniforms(GJ,E0);if(F0.refreshMaterialUniforms(GJ,b,$0,n,z.state.transmissionRenderTarget[R.id]),O0.needsLights&&O0.lightProbeGrid){let ZJ=O0.lightProbeGrid;GJ.probesSH.value=ZJ.texture,GJ.probesMin.value.copy(ZJ.boundingBox.min),GJ.probesMax.value.copy(ZJ.boundingBox.max),GJ.probesResolution.value.copy(ZJ.resolution)}O7.upload(T,s$(O0),GJ,g)}if(b.isShaderMaterial&&b.uniformsNeedUpdate===!0)O7.upload(T,s$(O0),GJ,g),b.uniformsNeedUpdate=!1;if(b.isSpriteMaterial)t0.setValue(T,"center",x.center);if(t0.setValue(T,"modelViewMatrix",x.modelViewMatrix),t0.setValue(T,"normalMatrix",x.normalMatrix),t0.setValue(T,"modelMatrix",x.matrixWorld),b.uniformsGroups!==void 0){let ZJ=b.uniformsGroups;for(let j9=0,F8=ZJ.length;j9<F8;j9++){let a$=ZJ[j9];D0.update(a$,sJ),D0.bind(a$,sJ)}}return sJ}function dW(R,S){R.ambientLightColor.needsUpdate=S,R.lightProbe.needsUpdate=S,R.sunLights.needsUpdate=S,R.sunLightShadows.needsUpdate=S,R.directionalLights.needsUpdate=S,R.directionalLightShadows.needsUpdate=S,R.pointLights.needsUpdate=S,R.pointLightShadows.needsUpdate=S,R.spotLights.needsUpdate=S,R.spotLightShadows.needsUpdate=S,R.rectAreaLights.needsUpdate=S,R.hemisphereLights.needsUpdate=S}function uW(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return d},this.getActiveMipmapLevel=function(){return o},this.getRenderTarget=function(){return m},this.setRenderTargetTextures=function(R,S,p){let b=w.get(R);if(b.__autoAllocateDepthBuffer=R.resolveDepthBuffer===!1,b.__autoAllocateDepthBuffer===!1)b.__useRenderToTexture=!1;w.get(R.texture).__webglTexture=S,w.get(R.depthTexture).__webglTexture=b.__autoAllocateDepthBuffer?void 0:p,b.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(R,S){let p=w.get(R);p.__webglFramebuffer=S,p.__useDefaultFramebuffer=S===void 0},this.setRenderTarget=function(R,S=0,p=0){m=R,d=S,o=p;let b=null,x=!1,E0=!1;if(R){let q0=w.get(R);if(q0.__useDefaultFramebuffer!==void 0){k.bindFramebuffer(T.FRAMEBUFFER,q0.__webglFramebuffer),a.copy(R.viewport),J0.copy(R.scissor),_0=R.scissorTest,k.viewport(a),k.scissor(J0),k.setScissorTest(_0),Q0=-1;return}else if(q0.__webglFramebuffer===void 0)g.setupRenderTarget(R);else if(q0.__hasExternalTextures)g.rebindTextures(R,w.get(R.texture).__webglTexture,w.get(R.depthTexture).__webglTexture);else if(R.depthBuffer){let f0=R.depthTexture;if(q0.__boundDepthTexture!==f0){if(f0!==null&&w.has(f0)&&(R.width!==f0.image.width||R.height!==f0.image.height))throw Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");g.setupDepthRenderbuffer(R)}}let M0=R.texture;if(M0.isData3DTexture||M0.isDataArrayTexture||M0.isCompressedArrayTexture)E0=!0;let k0=w.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget){if(Array.isArray(k0[S]))b=k0[S][p];else b=k0[S];x=!0}else if(R.samples>0&&g.useMultisampledRTT(R)===!1)b=w.get(R).__webglMultisampledFramebuffer;else if(Array.isArray(k0))b=k0[p];else b=k0;a.copy(R.viewport),J0.copy(R.scissor),_0=R.scissorTest}else a.copy(T0).multiplyScalar($0).floor(),J0.copy(B0).multiplyScalar($0).floor(),_0=FJ;if(p!==0)b=h;if(k.bindFramebuffer(T.FRAMEBUFFER,b))k.drawBuffers(R,b);if(k.viewport(a),k.scissor(J0),k.setScissorTest(_0),x){let q0=w.get(R.texture);T.framebufferTexture2D(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_CUBE_MAP_POSITIVE_X+S,q0.__webglTexture,p)}else if(E0){let q0=S;for(let M0=0;M0<R.textures.length;M0++){let k0=w.get(R.textures[M0]);T.framebufferTextureLayer(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0+M0,k0.__webglTexture,p,q0)}}else if(R!==null&&p!==0){let q0=w.get(R.texture);T.framebufferTexture2D(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_2D,q0.__webglTexture,p)}Q0=-1};function o$(R){let S=w.get(R);if(S.__readFormat!==R.format||S.__readType!==R.type)S.__readFormat=R.format,S.__readType=R.type,S.__formatReadable=XJ.textureFormatReadable(R.format),S.__typeReadable=XJ.textureTypeReadable(R.type);return S}if(this.readRenderTargetPixels=function(R,S,p,b,x,E0,R0,q0=0){if(!(R&&R.isWebGLRenderTarget)){S0("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let M0=w.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&R0!==void 0)M0=M0[R0];if(M0){k.bindFramebuffer(T.FRAMEBUFFER,M0);try{let k0=R.textures[q0],f0=k0.format,x0=k0.type;if(R.textures.length>1)T.readBuffer(T.COLOR_ATTACHMENT0+q0);let L0=o$(k0);if(L0.__formatReadable===!1){S0("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(L0.__typeReadable===!1){S0("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}if(S>=0&&S<=R.width-b&&(p>=0&&p<=R.height-x))T.readPixels(S,p,b,x,s.convert(f0),s.convert(x0),E0)}finally{let k0=m!==null?w.get(m).__webglFramebuffer:null;k.bindFramebuffer(T.FRAMEBUFFER,k0)}}},this.readRenderTargetPixelsAsync=async function(R,S,p,b,x,E0,R0,q0=0){if(!(R&&R.isWebGLRenderTarget))throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let M0=w.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&R0!==void 0)M0=M0[R0];if(M0)if(S>=0&&S<=R.width-b&&(p>=0&&p<=R.height-x)){k.bindFramebuffer(T.FRAMEBUFFER,M0);let k0=R.textures[q0],f0=k0.format,x0=k0.type;if(R.textures.length>1)T.readBuffer(T.COLOR_ATTACHMENT0+q0);let L0=o$(k0);if(L0.__formatReadable===!1)throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(L0.__typeReadable===!1)throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let i0=T.createBuffer();T.bindBuffer(T.PIXEL_PACK_BUFFER,i0),T.bufferData(T.PIXEL_PACK_BUFFER,E0.byteLength,T.STREAM_READ),T.readPixels(S,p,b,x,s.convert(f0),s.convert(x0),0),T.bindBuffer(T.PIXEL_PACK_BUFFER,null);let NJ=m!==null?w.get(m).__webglFramebuffer:null;k.bindFramebuffer(T.FRAMEBUFFER,NJ);let YJ=T.fenceSync(T.SYNC_GPU_COMMANDS_COMPLETE,0);return T.flush(),await LK(T,YJ,4),T.bindBuffer(T.PIXEL_PACK_BUFFER,i0),T.getBufferSubData(T.PIXEL_PACK_BUFFER,0,E0),T.bindBuffer(T.PIXEL_PACK_BUFFER,null),T.deleteBuffer(i0),T.deleteSync(YJ),E0}else throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(R,S=null,p=0){let b=Math.pow(2,-p),x=Math.floor(R.image.width*b),E0=Math.floor(R.image.height*b),R0=S!==null?S.x:0,q0=S!==null?S.y:0;g.setTexture2D(R,0),T.copyTexSubImage2D(T.TEXTURE_2D,p,0,0,R0,q0,x,E0),k.unbindTexture()},this.copyTextureToTexture=function(R,S,p=null,b=null,x=0,E0=0){let R0,q0,M0,k0,f0,x0,L0,i0,NJ,YJ=R.isCompressedTexture?R.mipmaps[E0]:R.image;if(p!==null)R0=p.max.x-p.min.x,q0=p.max.y-p.min.y,M0=p.isBox3?p.max.z-p.min.z:1,k0=p.min.x,f0=p.min.y,x0=p.isBox3?p.min.z:0;else{let GJ=Math.pow(2,-x);if(R0=Math.floor(YJ.width*GJ),q0=Math.floor(YJ.height*GJ),R.isDataArrayTexture)M0=YJ.depth;else if(R.isData3DTexture)M0=Math.floor(YJ.depth*GJ);else M0=1;k0=0,f0=0,x0=0}if(b!==null)L0=b.x,i0=b.y,NJ=b.z;else L0=0,i0=0,NJ=0;let e0=s.convert(S.format),AJ=s.convert(S.type),O0;if(S.isData3DTexture)g.setTexture3D(S,0),O0=T.TEXTURE_3D;else if(S.isDataArrayTexture||S.isCompressedArrayTexture)g.setTexture2DArray(S,0),O0=T.TEXTURE_2D_ARRAY;else g.setTexture2D(S,0),O0=T.TEXTURE_2D;k.activeTexture(T.TEXTURE0),k.pixelStorei(T.UNPACK_FLIP_Y_WEBGL,S.flipY),k.pixelStorei(T.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),k.pixelStorei(T.UNPACK_ALIGNMENT,S.unpackAlignment);let jJ=k.getParameter(T.UNPACK_ROW_LENGTH),u0=k.getParameter(T.UNPACK_IMAGE_HEIGHT),sJ=k.getParameter(T.UNPACK_SKIP_PIXELS),N9=k.getParameter(T.UNPACK_SKIP_ROWS),T9=k.getParameter(T.UNPACK_SKIP_IMAGES);k.pixelStorei(T.UNPACK_ROW_LENGTH,YJ.width),k.pixelStorei(T.UNPACK_IMAGE_HEIGHT,YJ.height),k.pixelStorei(T.UNPACK_SKIP_PIXELS,k0),k.pixelStorei(T.UNPACK_SKIP_ROWS,f0),k.pixelStorei(T.UNPACK_SKIP_IMAGES,x0);let E8=R.isDataArrayTexture||R.isData3DTexture,t0=S.isDataArrayTexture||S.isData3DTexture;if(R.isDepthTexture){let GJ=w.get(R),S9=w.get(S),ZJ=w.get(GJ.__renderTarget),j9=w.get(S9.__renderTarget);k.bindFramebuffer(T.READ_FRAMEBUFFER,ZJ.__webglFramebuffer),k.bindFramebuffer(T.DRAW_FRAMEBUFFER,j9.__webglFramebuffer);for(let F8=0;F8<M0;F8++){if(E8)T.framebufferTextureLayer(T.READ_FRAMEBUFFER,T.COLOR_ATTACHMENT0,w.get(R).__webglTexture,x,x0+F8),T.framebufferTextureLayer(T.DRAW_FRAMEBUFFER,T.COLOR_ATTACHMENT0,w.get(S).__webglTexture,E0,NJ+F8);T.blitFramebuffer(k0,f0,R0,q0,L0,i0,R0,q0,T.DEPTH_BUFFER_BIT,T.NEAREST)}k.bindFramebuffer(T.READ_FRAMEBUFFER,null),k.bindFramebuffer(T.DRAW_FRAMEBUFFER,null)}else if(x!==0||R.isRenderTargetTexture||w.has(R)){let GJ=w.get(R),S9=w.get(S);k.bindFramebuffer(T.READ_FRAMEBUFFER,r),k.bindFramebuffer(T.DRAW_FRAMEBUFFER,j);for(let ZJ=0;ZJ<M0;ZJ++){if(E8)T.framebufferTextureLayer(T.READ_FRAMEBUFFER,T.COLOR_ATTACHMENT0,GJ.__webglTexture,x,x0+ZJ);else T.framebufferTexture2D(T.READ_FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_2D,GJ.__webglTexture,x);if(t0)T.framebufferTextureLayer(T.DRAW_FRAMEBUFFER,T.COLOR_ATTACHMENT0,S9.__webglTexture,E0,NJ+ZJ);else T.framebufferTexture2D(T.DRAW_FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_2D,S9.__webglTexture,E0);if(x!==0)T.blitFramebuffer(k0,f0,R0,q0,L0,i0,R0,q0,T.COLOR_BUFFER_BIT,T.NEAREST);else if(t0)T.copyTexSubImage3D(O0,E0,L0,i0,NJ+ZJ,k0,f0,R0,q0);else T.copyTexSubImage2D(O0,E0,L0,i0,k0,f0,R0,q0)}k.bindFramebuffer(T.READ_FRAMEBUFFER,null),k.bindFramebuffer(T.DRAW_FRAMEBUFFER,null)}else if(t0)if(R.isDataTexture||R.isData3DTexture)T.texSubImage3D(O0,E0,L0,i0,NJ,R0,q0,M0,e0,AJ,YJ.data);else if(S.isCompressedArrayTexture)T.compressedTexSubImage3D(O0,E0,L0,i0,NJ,R0,q0,M0,e0,YJ.data);else T.texSubImage3D(O0,E0,L0,i0,NJ,R0,q0,M0,e0,AJ,YJ);else if(R.isDataTexture)T.texSubImage2D(T.TEXTURE_2D,E0,L0,i0,R0,q0,e0,AJ,YJ.data);else if(R.isCompressedTexture)T.compressedTexSubImage2D(T.TEXTURE_2D,E0,L0,i0,YJ.width,YJ.height,e0,YJ.data);else T.texSubImage2D(T.TEXTURE_2D,E0,L0,i0,R0,q0,e0,AJ,YJ);if(k.pixelStorei(T.UNPACK_ROW_LENGTH,jJ),k.pixelStorei(T.UNPACK_IMAGE_HEIGHT,u0),k.pixelStorei(T.UNPACK_SKIP_PIXELS,sJ),k.pixelStorei(T.UNPACK_SKIP_ROWS,N9),k.pixelStorei(T.UNPACK_SKIP_IMAGES,T9),E0===0&&S.generateMipmaps)T.generateMipmap(O0);k.unbindTexture()},this.initRenderTarget=function(R){if(w.get(R).__webglFramebuffer===void 0)g.setupRenderTarget(R)},this.initTexture=function(R){if(R.isCubeTexture)g.setTextureCube(R,0);else if(R.isData3DTexture)g.setTexture3D(R,0);else if(R.isDataArrayTexture||R.isCompressedArrayTexture)g.setTexture2DArray(R,0);else g.setTexture2D(R,0);k.unbindTexture()},this.resetState=function(){d=0,o=0,m=null,k.reset(),Y0.reset()},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return pQ}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(J){this._outputColorSpace=J;let Q=this.getContext();Q.drawingBufferColorSpace=m0._getDrawingBufferColorSpace(J),Q.unpackColorSpace=m0._getUnpackColorSpace()}}var YW={type:"change"},P$={type:"start"},UW={type:"end"},F6=new p8,XW=new oJ,SN=Math.cos(70*dQ.DEG2RAD),LJ=new f,pJ=2*Math.PI,r0={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},C$=0.000001;class w$ extends U6{constructor(J,Q=null){super(J,Q);if(this.state=r0.NONE,this.target=new f,this.cursor=new f,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=0.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:W9.ROTATE,MIDDLE:W9.DOLLY,RIGHT:W9.PAN},this.touches={ONE:g9.ROTATE,TWO:g9.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new f,this._lastQuaternion=new tJ,this._lastTargetPosition=new f,this._quat=new tJ().setFromUnitVectors(J.up,new f(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new q7,this._sphericalDelta=new q7,this._scale=1,this._panOffset=new f,this._rotateStart=new w0,this._rotateEnd=new w0,this._rotateDelta=new w0,this._panStart=new w0,this._panEnd=new w0,this._panDelta=new w0,this._dollyStart=new w0,this._dollyEnd=new w0,this._dollyDelta=new w0,this._dollyDirection=new f,this._mouse=new w0,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=yN.bind(this),this._onPointerDown=jN.bind(this),this._onPointerUp=fN.bind(this),this._onContextMenu=mN.bind(this),this._onMouseWheel=bN.bind(this),this._onKeyDown=xN.bind(this),this._onTouchStart=gN.bind(this),this._onTouchMove=pN.bind(this),this._onMouseDown=vN.bind(this),this._onMouseMove=hN.bind(this),this._interceptControlDown=lN.bind(this),this._interceptControlUp=dN.bind(this),this.domElement!==null)this.connect(this.domElement);this.update()}set cursorStyle(J){if(this._cursorStyle=J,J==="grab")this.domElement.style.cursor="grab";else this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(J){super.connect(J),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=r0.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents();let J=this.domElement.getRootNode();J.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),J.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(J){J.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=J}stopListenToKeyEvents(){if(this._domElementKeyEvents!==null)this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(YW),this.update(),this.state=r0.NONE}pan(J,Q){this._pan(J,Q),this.update()}dollyIn(J){this._dollyIn(J),this.update()}dollyOut(J){this._dollyOut(J),this.update()}rotateLeft(J){this._rotateLeft(J),this.update()}rotateUp(J){this._rotateUp(J),this.update()}update(J=null){let Q=this.object.position;if(LJ.copy(Q).sub(this.target),LJ.applyQuaternion(this._quat),this._spherical.setFromVector3(LJ),this.autoRotate&&this.state===r0.NONE)this._rotateLeft(this._getAutoRotationAngle(J));if(this.enableDamping)this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor;else this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi;let $=this.minAzimuthAngle,Z=this.maxAzimuthAngle;if(isFinite($)&&isFinite(Z)){if($<-Math.PI)$+=pJ;else if($>Math.PI)$-=pJ;if(Z<-Math.PI)Z+=pJ;else if(Z>Math.PI)Z-=pJ;if($<=Z)this._spherical.theta=Math.max($,Math.min(Z,this._spherical.theta));else this._spherical.theta=this._spherical.theta>($+Z)/2?Math.max($,this._spherical.theta):Math.min(Z,this._spherical.theta)}if(this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0)this.target.addScaledVector(this._panOffset,this.dampingFactor);else this.target.add(this._panOffset);this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let K=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let W=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),K=W!=this._spherical.radius}if(LJ.setFromSpherical(this._spherical),LJ.applyQuaternion(this._quatInverse),Q.copy(this.target).add(LJ),this.object.lookAt(this.target),this.enableDamping===!0)this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor);else this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0);if(this.zoomToCursor&&this._performCursorZoom){let W=null;if(this.object.isPerspectiveCamera){let H=LJ.length();W=this._clampDistance(H*this._scale);let Y=H-W;this.object.position.addScaledVector(this._dollyDirection,Y),this.object.updateMatrixWorld(),K=!!Y}else if(this.object.isOrthographicCamera){let H=new f(this._mouse.x,this._mouse.y,0);H.unproject(this.object);let Y=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),K=Y!==this.object.zoom;let X=new f(this._mouse.x,this._mouse.y,0);X.unproject(this.object),this.object.position.sub(X).add(H),this.object.updateMatrixWorld(),W=LJ.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;if(W!==null)if(this.screenSpacePanning)this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(W).add(this.object.position);else if(F6.origin.copy(this.object.position),F6.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(F6.direction))<SN)this.object.lookAt(this.target);else XW.setFromNormalAndCoplanarPoint(this.object.up,this.target),F6.intersectPlane(XW,this.target)}else if(this.object.isOrthographicCamera){let W=this.object.zoom;if(this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),W!==this.object.zoom)this.object.updateProjectionMatrix(),K=!0}if(this._scale=1,this._performCursorZoom=!1,K||this._lastPosition.distanceToSquared(this.object.position)>C$||8*(1-this._lastQuaternion.dot(this.object.quaternion))>C$||this._lastTargetPosition.distanceToSquared(this.target)>C$)return this.dispatchEvent(YW),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0;return!1}_getAutoRotationAngle(J){if(J!==null)return pJ/60*this.autoRotateSpeed*J;else return pJ/60/60*this.autoRotateSpeed}_getZoomScale(J){let Q=Math.abs(J*0.01);return Math.pow(0.95,this.zoomSpeed*Q)}_rotateLeft(J){this._sphericalDelta.theta-=J}_rotateUp(J){this._sphericalDelta.phi-=J}_panLeft(J,Q){LJ.setFromMatrixColumn(Q,0),LJ.multiplyScalar(-J),this._panOffset.add(LJ)}_panUp(J,Q){if(this.screenSpacePanning===!0)LJ.setFromMatrixColumn(Q,1);else LJ.setFromMatrixColumn(Q,0),LJ.crossVectors(this.object.up,LJ);LJ.multiplyScalar(J),this._panOffset.add(LJ)}_pan(J,Q){let $=this.domElement;if(this.object.isPerspectiveCamera){let Z=this.object.position;LJ.copy(Z).sub(this.target);let K=LJ.length();K*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*J*K/$.clientHeight,this.object.matrix),this._panUp(2*Q*K/$.clientHeight,this.object.matrix)}else if(this.object.isOrthographicCamera)this._panLeft(J*(this.object.right-this.object.left)/this.object.zoom/$.clientWidth,this.object.matrix),this._panUp(Q*(this.object.top-this.object.bottom)/this.object.zoom/$.clientHeight,this.object.matrix);else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1}_dollyOut(J){if(this.object.isPerspectiveCamera||this.object.isOrthographicCamera)this._scale/=J;else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1}_dollyIn(J){if(this.object.isPerspectiveCamera||this.object.isOrthographicCamera)this._scale*=J;else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1}_updateZoomParameters(J,Q){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let $=this.domElement.getBoundingClientRect(),Z=J-$.left,K=Q-$.top,W=$.width,H=$.height;this._mouse.x=Z/W*2-1,this._mouse.y=-(K/H)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(J){return Math.max(this.minDistance,Math.min(this.maxDistance,J))}_handleMouseDownRotate(J){this._rotateStart.set(J.clientX,J.clientY)}_handleMouseDownDolly(J){this._updateZoomParameters(J.clientX,J.clientX),this._dollyStart.set(J.clientX,J.clientY)}_handleMouseDownPan(J){this._panStart.set(J.clientX,J.clientY)}_handleMouseMoveRotate(J){this._rotateEnd.set(J.clientX,J.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let Q=this.domElement;this._rotateLeft(pJ*this._rotateDelta.x/Q.clientHeight),this._rotateUp(pJ*this._rotateDelta.y/Q.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(J){if(this._dollyEnd.set(J.clientX,J.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0)this._dollyOut(this._getZoomScale(this._dollyDelta.y));else if(this._dollyDelta.y<0)this._dollyIn(this._getZoomScale(this._dollyDelta.y));this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(J){this._panEnd.set(J.clientX,J.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(J){if(this._updateZoomParameters(J.clientX,J.clientY),J.deltaY<0)this._dollyIn(this._getZoomScale(J.deltaY));else if(J.deltaY>0)this._dollyOut(this._getZoomScale(J.deltaY));this.update()}_handleKeyDown(J){let Q=!1;switch(J.code){case this.keys.UP:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateUp(pJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(0,this.keyPanSpeed);Q=!0;break;case this.keys.BOTTOM:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateUp(-pJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(0,-this.keyPanSpeed);Q=!0;break;case this.keys.LEFT:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateLeft(pJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(this.keyPanSpeed,0);Q=!0;break;case this.keys.RIGHT:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateLeft(-pJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(-this.keyPanSpeed,0);Q=!0;break}if(Q)J.preventDefault(),this.update()}_handleTouchStartRotate(J){if(this._pointers.length===1)this._rotateStart.set(J.pageX,J.pageY);else{let Q=this._getSecondPointerPosition(J),$=0.5*(J.pageX+Q.x),Z=0.5*(J.pageY+Q.y);this._rotateStart.set($,Z)}}_handleTouchStartPan(J){if(this._pointers.length===1)this._panStart.set(J.pageX,J.pageY);else{let Q=this._getSecondPointerPosition(J),$=0.5*(J.pageX+Q.x),Z=0.5*(J.pageY+Q.y);this._panStart.set($,Z)}}_handleTouchStartDolly(J){let Q=this._getSecondPointerPosition(J),$=J.pageX-Q.x,Z=J.pageY-Q.y,K=Math.sqrt($*$+Z*Z);this._dollyStart.set(0,K)}_handleTouchStartDollyPan(J){if(this.enableZoom)this._handleTouchStartDolly(J);if(this.enablePan)this._handleTouchStartPan(J)}_handleTouchStartDollyRotate(J){if(this.enableZoom)this._handleTouchStartDolly(J);if(this.enableRotate)this._handleTouchStartRotate(J)}_handleTouchMoveRotate(J){if(this._pointers.length==1)this._rotateEnd.set(J.pageX,J.pageY);else{let $=this._getSecondPointerPosition(J),Z=0.5*(J.pageX+$.x),K=0.5*(J.pageY+$.y);this._rotateEnd.set(Z,K)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let Q=this.domElement;this._rotateLeft(pJ*this._rotateDelta.x/Q.clientHeight),this._rotateUp(pJ*this._rotateDelta.y/Q.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(J){if(this._pointers.length===1)this._panEnd.set(J.pageX,J.pageY);else{let Q=this._getSecondPointerPosition(J),$=0.5*(J.pageX+Q.x),Z=0.5*(J.pageY+Q.y);this._panEnd.set($,Z)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(J){let Q=this._getSecondPointerPosition(J),$=J.pageX-Q.x,Z=J.pageY-Q.y,K=Math.sqrt($*$+Z*Z);this._dollyEnd.set(0,K),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let W=(J.pageX+Q.x)*0.5,H=(J.pageY+Q.y)*0.5;this._updateZoomParameters(W,H)}_handleTouchMoveDollyPan(J){if(this.enableZoom)this._handleTouchMoveDolly(J);if(this.enablePan)this._handleTouchMovePan(J)}_handleTouchMoveDollyRotate(J){if(this.enableZoom)this._handleTouchMoveDolly(J);if(this.enableRotate)this._handleTouchMoveRotate(J)}_addPointer(J){this._pointers.push(J.pointerId)}_removePointer(J){delete this._pointerPositions[J.pointerId];for(let Q=0;Q<this._pointers.length;Q++)if(this._pointers[Q]==J.pointerId){this._pointers.splice(Q,1);return}}_isTrackingPointer(J){for(let Q=0;Q<this._pointers.length;Q++)if(this._pointers[Q]==J.pointerId)return!0;return!1}_trackPointer(J){let Q=this._pointerPositions[J.pointerId];if(Q===void 0)Q=new w0,this._pointerPositions[J.pointerId]=Q;Q.set(J.pageX,J.pageY)}_getSecondPointerPosition(J){let Q=J.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[Q]}_customWheelEvent(J){let Q=J.deltaMode,$={clientX:J.clientX,clientY:J.clientY,deltaY:J.deltaY};switch(Q){case 1:$.deltaY*=16;break;case 2:$.deltaY*=100;break}if(J.ctrlKey&&!this._controlActive)$.deltaY*=10;return $}}function jN(J){if(this.enabled===!1)return;if(this._pointers.length===0)this.domElement.setPointerCapture(J.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp);if(this._isTrackingPointer(J))return;if(this._addPointer(J),J.pointerType==="touch")this._onTouchStart(J);else this._onMouseDown(J);if(this._cursorStyle==="grab")this.domElement.style.cursor="grabbing"}function yN(J){if(this.enabled===!1)return;if(J.pointerType==="touch")this._onTouchMove(J);else this._onMouseMove(J)}function fN(J){switch(this._removePointer(J),this._pointers.length){case 0:if(this.domElement.releasePointerCapture(J.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(UW),this.state=r0.NONE,this._cursorStyle==="grab")this.domElement.style.cursor="grab";break;case 1:let Q=this._pointers[0],$=this._pointerPositions[Q];this._onTouchStart({pointerId:Q,pageX:$.x,pageY:$.y});break}}function vN(J){let Q;switch(J.button){case 0:Q=this.mouseButtons.LEFT;break;case 1:Q=this.mouseButtons.MIDDLE;break;case 2:Q=this.mouseButtons.RIGHT;break;default:Q=-1}switch(Q){case W9.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(J),this.state=r0.DOLLY;break;case W9.ROTATE:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(J),this.state=r0.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(J),this.state=r0.ROTATE}break;case W9.PAN:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(J),this.state=r0.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(J),this.state=r0.PAN}break;default:this.state=r0.NONE}if(this.state!==r0.NONE)this.dispatchEvent(P$)}function hN(J){switch(this.state){case r0.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(J);break;case r0.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(J);break;case r0.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(J);break}}function bN(J){if(this.enabled===!1||this.enableZoom===!1||this.state!==r0.NONE)return;J.preventDefault(),this.dispatchEvent(P$),this._handleMouseWheel(this._customWheelEvent(J)),this.dispatchEvent(UW)}function xN(J){if(this.enabled===!1)return;this._handleKeyDown(J)}function gN(J){switch(this._trackPointer(J),this._pointers.length){case 1:switch(this.touches.ONE){case g9.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(J),this.state=r0.TOUCH_ROTATE;break;case g9.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(J),this.state=r0.TOUCH_PAN;break;default:this.state=r0.NONE}break;case 2:switch(this.touches.TWO){case g9.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(J),this.state=r0.TOUCH_DOLLY_PAN;break;case g9.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(J),this.state=r0.TOUCH_DOLLY_ROTATE;break;default:this.state=r0.NONE}break;default:this.state=r0.NONE}if(this.state!==r0.NONE)this.dispatchEvent(P$)}function pN(J){switch(this._trackPointer(J),this.state){case r0.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(J),this.update();break;case r0.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(J),this.update();break;case r0.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(J),this.update();break;case r0.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(J),this.update();break;default:this.state=r0.NONE}}function mN(J){if(this.enabled===!1)return;J.preventDefault()}function lN(J){if(J.key==="Control")this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0})}function dN(J){if(J.key==="Control")this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0})}class D6 extends _J{constructor(J=document.createElement("div")){super();this.isCSS2DObject=!0,this.element=J,this.element.style.position="absolute",this.element.style.userSelect="none",this.element.setAttribute("draggable",!1),this.center=new w0(0.5,0.5),this.rotation2D=0,this.addEventListener("removed",function(){this.traverse(function(Q){if(Q.element&&Q.element instanceof Q.element.ownerDocument.defaultView.Element&&Q.element.parentNode!==null)Q.element.remove()})})}copy(J,Q){return super.copy(J,Q),this.element=J.element.cloneNode(!0),this.center=J.center,this.rotation2D=J.rotation2D,this}}var c8=new f,GW=new KJ,NW=new KJ,qW=new f,EW=new f;class _${constructor(J={}){let Q=this,$,Z,K,W,H={objects:new WeakMap},Y=J.element!==void 0?J.element:document.createElement("div");Y.style.overflow="hidden",this.domElement=Y,this.sortObjects=!0,this.getSize=function(){return{width:$,height:Z}},this.render=function(D,M){if(D.matrixWorldAutoUpdate===!0)D.updateMatrixWorld();if(M.parent===null&&M.matrixWorldAutoUpdate===!0)M.updateMatrixWorld();if(GW.copy(M.matrixWorldInverse),NW.multiplyMatrices(M.projectionMatrix,GW),U(D,D,M),this.sortObjects)G(D)},this.setSize=function(D,M){$=D,Z=M,K=$/2,W=Z/2,Y.style.width=D+"px",Y.style.height=M+"px"};function X(D){if(D.isCSS2DObject)D.element.style.display="none";for(let M=0,I=D.children.length;M<I;M++)X(D.children[M])}function U(D,M,I){if(D.visible===!1){X(D);return}if(D.isCSS2DObject){c8.setFromMatrixPosition(D.matrixWorld),c8.applyMatrix4(NW);let F=c8.z>=-1&&c8.z<=1&&D.layers.test(I.layers)===!0,E=D.element;if(E.style.display=F===!0?"":"none",F===!0){D.onBeforeRender(Q,M,I);let _=100*D.center.x,V=100*D.center.y;E.style.transformOrigin=`${_}% ${V}%`;let z=-D.rotation2D,C=c8.x*K+K,P=-c8.y*W+W;if(E.style.transform=`translate(${-_}%, ${-V}%) translate(${C}px, ${P}px) rotate(${z}rad)`,E.parentNode!==Y)Y.appendChild(E);D.onAfterRender(Q,M,I)}let A={distanceToCameraSquared:N(I,D)};H.objects.set(D,A)}for(let F=0,E=D.children.length;F<E;F++)U(D.children[F],M,I)}function N(D,M){return qW.setFromMatrixPosition(D.matrixWorld),EW.setFromMatrixPosition(M.matrixWorld),qW.distanceToSquared(EW)}function q(D){let M=[];return D.traverseVisible(function(I){if(I.isCSS2DObject)M.push(I)}),M}function G(D){let M=q(D).sort(function(F,E){if(F.renderOrder!==E.renderOrder)return E.renderOrder-F.renderOrder;let A=H.objects.get(F).distanceToCameraSquared,_=H.objects.get(E).distanceToCameraSquared;return A-_}),I=M.length;for(let F=0,E=M.length;F<E;F++)M[F].element.style.zIndex=I-F}}}function FW(J,Q=2400){let $={flow:0,step:0,progress:0,playing:!1,finished:!1},Z=()=>J[$.flow]?.steps[$.step]??null;function K(){Object.assign($,{step:0,progress:0,playing:!1,finished:!1})}return{state:$,current:Z,choose(W){if(!Number.isInteger(W)||!J[W])return!1;return $.flow=W,K(),!0},restart:K,pause(){$.playing=!1},play(){if(!Z())return;if($.finished)K();$.playing=!0},step(){if($.playing=!1,!Z())return;if($.step+1<J[$.flow].steps.length)$.step++,$.progress=0,$.finished=!1;else $.progress=1,$.finished=!0},tick(W){if(!$.playing||!Z()||!Number.isFinite(W)||W<=0)return;$.progress+=W/Q;while($.progress>=1){if($.step+1===J[$.flow].steps.length){$.progress=1,$.playing=!1,$.finished=!0;break}$.progress--,$.step++}}}}function DW(J,Q){if(!J.length)return null;let $=J.slice(1).map((W,H)=>Math.hypot(W.x-J[H].x,W.z-J[H].z)),Z=$.reduce((W,H)=>W+H,0),K=Math.max(0,Math.min(1,Q))*Z;for(let W=0;W<$.length;W++){if(K<=$[W]&&$[W]>0){let H=K/$[W];return{x:J[W].x+(J[W+1].x-J[W].x)*H,z:J[W].z+(J[W+1].z-J[W].z)*H}}K-=$[W]}return{...J.at(-1)}}function uN(J){let Q=0;for(let $=0;$<J.length;$++){let Z=J[$],K=J[($+1)%J.length];Q+=Z[0]*K[1]-K[0]*Z[1]}return Q}function T$(J,Q,$){let Z=Q/2,K=$/2,W=[];if(J==="database")for(let H=0;H<40;H++){let Y=H/40*Math.PI*2;W.push([Math.cos(Y)*Z,Math.sin(Y)*K])}else if(J==="external")W.push([-Z*0.58,-K],[Z*0.58,-K],[Z,0],[Z*0.58,K],[-Z*0.58,K],[-Z,0]);else if(J==="messagebus")W.push([-Z,-K*0.62],[Z,-K*0.62],[Z,K*0.62],[-Z,K*0.62]);else{let H=Math.min(Z,K)*0.34,Y=[[Z-H,-K+H,-Math.PI/2],[Z-H,K-H,0],[-Z+H,K-H,Math.PI/2],[-Z+H,-K+H,Math.PI]];for(let[X,U,N]of Y)for(let q=0;q<=6;q++){let G=N+q/6*(Math.PI/2);W.push([X+Math.cos(G)*H,U+Math.sin(G)*H])}}return uN(W)>0?W.reverse():W}function OW(J,Q,$,Z){let K=Q/2,W=$/2,H=Z+0.02,Y=[],X=(N,q,G,D,M,I)=>{let F=[];for(let E=0;E<=24;E++){let A=M+E/24*(I-M);F.push([G+Math.cos(A)*N,D+Math.sin(A)*q])}return F},U=(N)=>N.map(([q,G])=>[q*K,H,G*W]);if(J==="frontend"){Y.push([[-0.82,0.46],[0.82,0.46]]);let N=0.018*W/K;for(let q of[-0.72,-0.58,-0.44])Y.push(X(N,0.018,q,0.72,0,Math.PI*2));Y.push([[-0.62,0.11],[-0.28,-0.18],[-0.62,-0.46]]),Y.push([[0.02,-0.46],[0.45,-0.46]])}else if(J==="backend")Y.push([[-0.35,0.43],[-0.6,0],[-0.35,-0.43]]),Y.push([[0.35,0.43],[0.6,0],[0.35,-0.43]]);else if(J==="database")Y.push(X(0.545,0.194,0,0.333,0,Math.PI*2)),Y.push([[-0.545,0.333],[-0.545,-0.333]]),Y.push([[0.545,0.333],[0.545,-0.333]]),Y.push(X(0.545,0.194,0,-0.333,Math.PI,Math.PI*2));else if(J==="messagebus")for(let N of[-0.5,0,0.5])Y.push([[N,-0.86],[N,0.86]]);else if(J==="external")Y.push([[-0.4,-0.3],[0.4,0.3],[0.05,0.3]]),Y.push([[0.4,0.3],[0.4,-0.05]]);return Y.map(U)}var RW=[0.3,0.6],MW=Math.cos(0.44);var kJ=window.ATLAS_SCENE;if(!kJ?.nodes?.length)throw Error("Prism needs at least one component");var G8=document.getElementById("stage"),d9=document.getElementById("gl"),VW=document.getElementById("labels"),i8=new A$({canvas:d9,antialias:!0});i8.setPixelRatio(Math.min(devicePixelRatio,2));var BW=new _$({element:VW}),U9=new J6,WJ=new m8(-1,1,1,-1,0.1,1000),fJ=new w$(WJ,d9);fJ.enableDamping=!1;fJ.maxPolarAngle=Math.PI/2-0.08;fJ.minPolarAngle=0.08;fJ.minZoom=0.3;fJ.maxZoom=8;fJ.mouseButtons.LEFT=W9.PAN;fJ.mouseButtons.RIGHT=W9.ROTATE;fJ.screenSpacePanning=!0;var EJ={theme:"dark",selected:null,view:"all",tab:"does",projection:"infra"},J9=FW(kJ.flows||[]),f$=[],IW={dark:{paper:867181,ink:15660799,accent:8384767,warm:16757086},light:{paper:15988732,ink:801387,accent:25256,warm:9851136}},L9={uPaper:{value:new g0},uInk:{value:new g0},uAccent:{value:new g0},uWarm:{value:new g0},uSelected:{value:-1},uPixelRatio:{value:i8.getPixelRatio()},uWorldPixel:{value:0.05},uTraceNode:{value:-1}},v$="#include <colorspace_fragment>",w9=new X9,zW=[],AW=[],CW=[],PW=[],O6=new Map(kJ.nodes.map((J)=>[J.id,J])),mJ=(J)=>String(J??"").replace(/[&<>"']/g,(Q)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[Q]),wW=new SJ({uniforms:L9,vertexShader:`varying vec2 vGround;
    void main() { vec4 world = modelMatrix * vec4(position, 1.0); vGround = world.xz;
      gl_Position = projectionMatrix * viewMatrix * world; }`,fragmentShader:`uniform vec3 uPaper, uInk; uniform float uPixelRatio;
    varying vec2 vGround;
    float grid(vec2 p) {
      vec2 derivative = max(fwidth(p), vec2(0.00001));
      vec2 distance = abs(fract(p - 0.5) - 0.5) / derivative;
      return 1.0 - smoothstep(0.0, 0.65 * uPixelRatio, min(distance.x, distance.y));
    }
    void main() {
      float fine = grid(vGround), major = grid(vGround / 5.0);
      gl_FragColor = vec4(mix(uPaper, uInk, max(fine * 0.025, major * 0.065)), 1.0);
      ${v$}
    }`}),M6=new zJ(new K8(2000,2000),wW);M6.rotation.x=-Math.PI/2;M6.position.y=-0.03;U9.add(M6);var _W=new SJ({uniforms:L9,vertexShader:`attribute vec2 aFaceUv, aHatch; attribute float aFace, aIndex, aRemoved;
    varying vec2 vUv, vHatch; varying float vFace, vIndex, vRemoved;
    void main() { vUv=aFaceUv; vHatch=aHatch; vFace=aFace; vIndex=aIndex; vRemoved=aRemoved;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,fragmentShader:`uniform vec3 uPaper,uInk,uAccent; uniform float uSelected,uPixelRatio,uTraceNode;
    varying vec2 vUv,vHatch; varying float vFace,vIndex,vRemoved;
    void main() {
      vec2 edgeDistance=min(vUv,1.0-vUv)/max(fwidth(vUv),vec2(0.00001));
      float edge=1.0-smoothstep(0.55*uPixelRatio,1.1*uPixelRatio,min(edgeDistance.x,edgeDistance.y));
      float cycle=(vHatch.x+vHatch.y)*4.0;
      float stripe=abs(fract(cycle-0.5)-0.5)/max(fwidth(cycle),0.00001);
      float hatch=(1.0-smoothstep(0.0,0.65*uPixelRatio,stripe))*step(0.5,vFace);
      float selected=max(1.0-step(0.5,abs(vIndex-uSelected)),1.0-step(0.5,abs(vIndex-uTraceNode)));
      vec3 ink=mix(uInk,uAccent,selected);
      float amount=max(edge*0.92,hatch*0.22);
      vec3 color=mix(uPaper,ink,max(amount,selected*0.08));
      if(vRemoved>0.5) {
        float dash=step(0.38,fract((vHatch.x+vHatch.y)*2.0));
        if(edge*dash<0.1) discard;
        color=mix(uPaper,uInk,0.4);
      }
      gl_FragColor=vec4(color,1.0);
      ${v$}
    }`}),nJ={position:[],aFaceUv:[],aHatch:[],aFace:[],aIndex:[],aRemoved:[]};function LW(J,Q,$){for(let Z of J)nJ.position.push(...Z),nJ.aFaceUv.push(0.5,0.5),nJ.aHatch.push(Z[0],Z[2]),nJ.aFace.push(0),nJ.aIndex.push(Q),nJ.aRemoved.push($)}function cN(J,Q,$,Z){for(let K of[0,1,2,0,2,3])nJ.position.push(...J[K]),nJ.aFaceUv.push(0.5,0.5),nJ.aHatch.push(Q[K][0],Q[K][1]),nJ.aFace.push(1),nJ.aIndex.push($),nJ.aRemoved.push(Z)}kJ.nodes.forEach((J,Q)=>{let{x:$,z:Z}=J,K=$+J.w,W=Z+J.d,H=Math.max(0.08,J.h),Y=J.state==="removed"?1:0;w9.expandByPoint(new f($,0,Z)),w9.expandByPoint(new f(K,H,W));let X=$+J.w/2,U=Z+J.d/2,q=T$(J.type,J.w,J.d).map(([I,F])=>[X+I,U+F]);if(Y===0){for(let F=1;F<q.length-1;F++)LW([[q[0][0],H,q[0][1]],[q[F][0],H,q[F][1]],[q[F+1][0],H,q[F+1][1]]],Q,Y);let I=0;for(let F=0;F<q.length;F++){let E=q[F],A=q[(F+1)%q.length],_=Math.hypot(A[0]-E[0],A[1]-E[1]);cN([[E[0],0,E[1]],[A[0],0,A[1]],[A[0],H,A[1]],[E[0],H,E[1]]],[[I,0],[I+_,0],[I+_,H],[I,H]],Q,Y),I+=_}if(J.type==="database")for(let F of RW){let E=H*F;for(let A=1;A<q.length-1;A++)LW([[q[0][0],E,q[0][1]],[q[A][0],E,q[A][1]],[q[A+1][0],E,q[A+1][1]]],Q,Y)}}let G=new zJ(new l9(J.w,H,J.d),new $8({visible:!1}));G.position.set($+J.w/2,H/2,Z+J.d/2),G.userData.id=J.id,zW.push(G),U9.add(G);let D=document.createElement("button");D.className="plabel"+(Y?" gone":""),D.innerHTML="<b>"+mJ(J.code)+"</b>",D.title=J.name,D.dataset.node=J.id,D.addEventListener("pointerdown",(I)=>I.stopPropagation()),D.addEventListener("click",()=>M7(J.id));let M=new D6(D);M.position.set($+J.w/2,H+0.04,Z+J.d/2),U9.add(M),AW.push({element:D,object:M,id:J.id})});var TW=new gJ;for(let[J,Q]of Object.entries(nJ))TW.setAttribute(J,new IJ(Q,J==="position"?3:["aFaceUv","aHatch"].includes(J)?2:1));U9.add(new zJ(TW,_W));var nN=new SJ({uniforms:{...L9,uTrace:{value:0}},transparent:!0,depthWrite:!1,side:rJ,vertexShader:`attribute vec3 aOffset; attribute float aDistance,aSide,aKind;
    uniform float uWorldPixel; varying float vDistance,vSide,vKind;
    void main(){vDistance=aDistance;vSide=aSide;vKind=aKind;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position+aOffset*uWorldPixel,1.0);}`,fragmentShader:`uniform vec3 uInk,uWarm,uAccent; uniform float uWorldPixel,uTrace; varying float vDistance,vSide,vKind;
    void main(){float opacity=1.0;
      if(vKind>2.5) opacity=0.34;
      float dash=1.0;
      if(vKind>1.5) dash=step(0.36,fract(vDistance/max(uWorldPixel*10.0,0.001)));
      float alpha=(1.0-smoothstep(0.65,1.0,abs(vSide)))*opacity*dash;
      if(alpha<0.01)discard;
      gl_FragColor=vec4(mix(vKind>0.5&&vKind<1.5?uWarm:uInk,uAccent,uTrace),alpha);
      ${v$}
    }`});function h$(J,Q,$,Z){let K={position:[],aOffset:[],aDistance:[],aSide:[],aKind:[]},W=(N,q,G,D,M=Q)=>{K.position.push(N.x,N.y,N.z),K.aOffset.push(q.x,q.y,q.z),K.aDistance.push(G),K.aSide.push(D),K.aKind.push(M)},H=0;for(let N of J){for(let q=1;q<N.length;q++){let G=N[q-1],D=N[q],M=D.clone().sub(G),I=M.length();if(I<0.00001)continue;M.divideScalar(I);let F=new f(-M.z,0,M.x).multiplyScalar($/2);for(let[E,A,_]of[[G,1,H],[G,-1,H],[D,1,H+I],[D,1,H+I],[G,-1,H],[D,-1,H+I]])W(E,F.clone().multiplyScalar(A),_,A);H+=I}if(Z&&N.length>1){let q=N.at(-1),G=q.clone().sub(N.at(-2)).normalize(),D=new f(-G.z,0,G.x);for(let M of[new f,G.clone().multiplyScalar(-7).addScaledVector(D,3),G.clone().multiplyScalar(-7).addScaledVector(D,-3)])W(q,M,0,0,Q===1?1:0)}}let Y=new gJ;for(let[N,q]of Object.entries(K))Y.setAttribute(N,new IJ(q,["position","aOffset"].includes(N)?3:1));let X=nN.clone();X.uniforms={...L9,uTrace:{value:0}};let U=new zJ(Y,X);return U.frustumCulled=!1,U9.add(U),U}function SW(J,Q,$=1.5,Z=!1){return h$([J],Q,$,Z)}var jW=[],yW=[];kJ.nodes.forEach((J)=>{let Q=J.state==="removed",$=J.x+J.w/2,Z=J.z+J.d/2,K=Math.max(0.08,J.h),W=T$(J.type,J.w,J.d),H=Q?yW:jW,Y=(X)=>[...W,W[0]].map(([U,N])=>new f($+U,X,Z+N));H.push(Y(K),Y(0.002));for(let X=0;X<W.length;X++){let U=W[(X-1+W.length)%W.length],N=W[X],q=W[(X+1)%W.length],G=new w0(N[0]-U[0],N[1]-U[1]).normalize(),D=new w0(q[0]-N[0],q[1]-N[1]).normalize();if(G.dot(D)<MW)H.push([new f($+N[0],0.002,Z+N[1]),new f($+N[0],K,Z+N[1])])}if(!Q)for(let X of OW(J.type,J.w,J.d,K))H.push(X.map(([U,N,q])=>new f(U+$,N,q+Z)))});h$(jW,0,1.1);h$(yW,2,1.1);function fW(J,Q,$){let Z=document.createElement("div");Z.className=$,Z.textContent=J;let K=new D6(Z);return K.position.copy(Q),U9.add(K),{element:Z,object:K}}for(let J of kJ.zones){let Q=[[J.x0,J.z0],[J.x1,J.z0],[J.x1,J.z1],[J.x0,J.z1],[J.x0,J.z0]].map(([$,Z])=>new f($,0.01,Z));Q.forEach(($)=>w9.expandByPoint($)),SW(Q,3,1.3),PW.push(fW(J.label,new f(J.x0,0.1,J.z0),"zlabel"))}for(let J of kJ.routes){let Q=J.points.map(($)=>new f($.x,0.025,$.z));if(Q.forEach(($)=>w9.expandByPoint($)),f$.push(SW(Q,J.variant,3,!0)),J.label){let $=0,Z=Q[0];for(let K=1;K<Q.length;K++){let W=Q[K].distanceTo(Q[K-1]);if(W>$)$=W,Z=Q[K].clone().add(Q[K-1]).multiplyScalar(0.5)}CW.push({...fW(J.label,Z.clone().setY(0.08),"elabel"),from:J.from,to:J.to})}}var _9=new zJ(new N7(1,12,8),new $8({color:IW.dark.accent,depthTest:!1,depthWrite:!1}));_9.visible=!1;_9.renderOrder=20;_9.userData.excludeFit=!0;U9.add(_9);var sN=new f(1,Math.sqrt(0.6666666666666666),1).normalize();function b$(J=w9){let Q=J.getCenter(new f);fJ.minPolarAngle=EJ.projection==="flow"?0.000001:0.08,fJ.enableRotate=EJ.projection==="infra",fJ.target.copy(Q),WJ.position.copy(Q).addScaledVector(EJ.projection==="flow"?new f(0,1,0.000001):sN,100),WJ.zoom=1,WJ.lookAt(Q),WJ.updateMatrixWorld();let $=new X9,Z=new f;if(J===w9)for(let q of U9.children){if(q===M6||!q.geometry||q.userData.excludeFit)continue;let G=q.geometry.attributes.position;for(let D=0;D<G.count;D++)Z.fromBufferAttribute(G,D).applyMatrix4(q.matrixWorld).applyMatrix4(WJ.matrixWorldInverse),$.expandByPoint(Z)}else for(let q of[J.min.x,J.max.x])for(let G of[J.min.y,J.max.y])for(let D of[J.min.z,J.max.z])$.expandByPoint(Z.set(q,G,D).applyMatrix4(WJ.matrixWorldInverse));let K=$.getCenter(new f).setZ(0).applyQuaternion(WJ.quaternion);fJ.target.add(K),WJ.position.add(K),WJ.updateMatrixWorld();let W=($.max.x-$.min.x)/2,H=($.max.y-$.min.y)/2,Y=G8.clientWidth,X=G8.clientHeight,U=36,N=Math.max(2*W/Math.max(1,Y-2*U),2*H/Math.max(1,X-2*U));WJ.left=-Y*N/2,WJ.right=-WJ.left,WJ.top=X*N/2,WJ.bottom=-WJ.top,WJ.updateProjectionMatrix(),fJ.update(),N8()}function x$(){let J=kJ.views.find(($)=>$.id===EJ.view);if(!J?.nodes?.length)return w9;let Q=new X9;for(let $ of J.nodes){let Z=O6.get($);if(Z)Q.expandByPoint(new f(Z.x,0,Z.z)),Q.expandByPoint(new f(Z.x+Z.w,Z.h,Z.z+Z.d))}return Q.isEmpty()?w9:Q}function vW(){let{clientWidth:J,clientHeight:Q}=G8;if(!J||!Q)return;i8.setSize(J,Q,!1),BW.setSize(J,Q),b$(x$())}function g$(J){EJ.view=J,document.querySelectorAll(".ch").forEach((Q)=>Q.setAttribute("aria-pressed",String(Q.dataset.view===J))),b$(x$())}var s8=document.getElementById("side"),S$=document.getElementById("pb");for(let J of new Set(kJ.nodes.map((Q)=>Q.group))){let Q=kJ.nodes.filter((Z)=>Z.group===J),$=document.createElement("div");$.className="gh",$.innerHTML="<span>"+mJ(J)+"</span><span>"+Q.length+"</span>",s8.append($);for(let Z of Q){let K=document.createElement("button");K.className="row"+(Z.state==="removed"?" ghost":""),K.dataset.node=Z.id,K.innerHTML='<span class="cd">'+mJ(Z.code)+'</span><span class="nm">'+mJ(Z.name)+"</span>",K.addEventListener("click",()=>{M7(Z.id),s8.classList.remove("open")}),s8.append(K)}}var hW=document.getElementById("chapters");hW.innerHTML='<span class="lbl">Views</span>';for(let J of kJ.views){let Q=document.createElement("button");Q.className="ch",Q.dataset.view=J.id,Q.textContent=J.label,Q.setAttribute("aria-pressed",String(J.id==="all")),Q.addEventListener("click",()=>g$(J.id)),hW.append(Q)}function p$(){let J=O6.get(EJ.selected);if(document.getElementById("selected-heading").textContent=J?J.code+" · "+J.name:"System overview",!J){S$.innerHTML=kJ.introHtml;return}let Q=EJ.tab==="does"?J.does:J.built;S$.innerHTML='<div class="k">'+mJ(J.group)+'</div><h2 class="pt">'+mJ(J.name)+'</h2><p class="ps">'+mJ(J.code)+" · "+mJ(J.type)+'</p><div class="k">'+(EJ.tab==="does"?"What it does":"How it is built")+"</div><p>"+mJ(Q)+'</p><dl class="facts">'+J.facts.map(([Z,K])=>"<dt>"+mJ(Z)+"</dt><dd>"+mJ(K)+"</dd>").join("")+"</dl>";let $=kJ.routes.filter((Z)=>Z.from===J.id||Z.to===J.id);S$.innerHTML+='<div class="k">Connections</div><div class="cxs">'+$.map((Z)=>'<div class="cx"><span class="cxa">'+mJ(O6.get(Z.from).code)+'</span><span>→</span><span class="cxa">'+mJ(O6.get(Z.to).code)+'</span><span class="cxl">'+mJ(Z.label)+"</span></div>").join("")+"</div>"}function M7(J){EJ.selected=J,L9.uSelected.value=kJ.nodes.findIndex((Q)=>Q.id===J),document.querySelectorAll("[data-node]").forEach((Q)=>Q.classList.toggle("on",Q.dataset.node===J)),p$(),N8()}for(let J of["does","built"])document.getElementById("t"+J).addEventListener("click",()=>{EJ.tab=J;for(let Q of["does","built"])document.getElementById("t"+Q).setAttribute("aria-selected",String(J===Q));p$()});for(let J of["reset","mreset"])document.getElementById(J).addEventListener("click",()=>{M7(null),g$("all")});document.getElementById("export").addEventListener("click",()=>{N8();let J=document.createElement("canvas");J.width=d9.width,J.height=d9.height;let Q=J.getContext("2d");Q.drawImage(d9,0,0);let $=G8.getBoundingClientRect(),Z=J.width/$.width;Q.scale(Z,Z);for(let K of VW.children){let W=getComputedStyle(K),H=K.getBoundingClientRect();if(W.display==="none"||W.visibility==="hidden"||H.right<$.left||H.left>$.right||H.bottom<$.top||H.top>$.bottom)continue;Q.fillStyle=W.backgroundColor,Q.fillRect(H.left-$.left,H.top-$.top,H.width,H.height);let Y=getComputedStyle(K.querySelector("b")||K);Q.font=Y.font,Q.fillStyle=W.color,Q.textAlign="center",Q.textBaseline="middle",Q.fillText(K.textContent,H.left-$.left+H.width/2,H.top-$.top+H.height/2)}J.toBlob((K)=>{if(!K)return;let W=URL.createObjectURL(K),H=document.createElement("a");H.href=W,H.download="atlas-prism.png",H.click(),setTimeout(()=>URL.revokeObjectURL(W),1000)},"image/png")});for(let J of["theme","mtheme"])document.getElementById(J).addEventListener("click",()=>bW(EJ.theme==="dark"?"light":"dark"));document.getElementById("menuBtn").addEventListener("click",()=>s8.classList.add("open"));document.getElementById("sideClose").addEventListener("click",()=>s8.classList.remove("open"));document.getElementById("grab").addEventListener("click",()=>document.getElementById("mid").classList.toggle("expanded"));window.addEventListener("keydown",(J)=>{if(J.key==="Escape")M7(null),g$("all"),s8.classList.remove("open")});var kW=new X6,R6=null;d9.addEventListener("pointerdown",(J)=>{R6={x:J.clientX,y:J.clientY}});d9.addEventListener("click",(J)=>{if(!R6||Math.hypot(J.clientX-R6.x,J.clientY-R6.y)>4)return;let Q=d9.getBoundingClientRect();kW.setFromCamera(new w0((J.clientX-Q.left)/Q.width*2-1,1-(J.clientY-Q.top)/Q.height*2),WJ),M7(kW.intersectObjects(zW)[0]?.object.userData.id??null)});function bW(J){EJ.theme=J;let Q=IW[J];for(let $ of["Paper","Ink","Accent","Warm"])L9["u"+$].value.setHex(Q[$.toLowerCase()]);i8.setClearColor(Q.paper),document.documentElement.dataset.theme=J,document.getElementById("theme").textContent=J==="dark"?"Light":"Dark",N8()}function N8(){L9.uWorldPixel.value=(WJ.top-WJ.bottom)/(Math.max(1,G8.clientHeight)*WJ.zoom),_9.scale.setScalar(L9.uWorldPixel.value*4),_9.material.color.copy(L9.uAccent.value),i8.render(U9,WJ),BW.render(U9,WJ);let J=[];for(let{element:$}of AW){let Z=$.getBoundingClientRect();J.push(Z)}let Q=($,Z)=>$.left<Z.right+6&&$.right>Z.left-6&&$.top<Z.bottom+4&&$.bottom>Z.top-4;for(let $ of PW){$.element.style.visibility="visible";let Z=$.element.getBoundingClientRect();if(J.some((K)=>Q(Z,K)))$.element.style.visibility="hidden";else J.push(Z)}for(let $ of CW){let Z=EJ.projection==="flow"||WJ.zoom>=1.35||$.from===EJ.selected||$.to===EJ.selected;if($.element.style.visibility=Z?"visible":"hidden",Z){let K=$.element.getBoundingClientRect();if(J.some((W)=>Q(K,W)))$.element.style.visibility="hidden";else J.push(K)}}document.getElementById("zoomnote").classList.toggle("show",WJ.zoom<1.35&&!EJ.selected)}var R7=0,n8=null,j$=document.getElementById("flow-select"),y$=document.getElementById("play");for(let[J,Q]of(kJ.flows||[]).entries()){let $=document.createElement("option");$.value=J,$.textContent=Q.label,j$.append($)}function q8(){let J=J9.current(),Q=J9.state;y$.textContent=Q.playing?"Pause":"Play",y$.setAttribute("aria-pressed",String(Q.playing));let $=document.getElementById("flow-status");if($.textContent=J?`${Q.step+1} / ${kJ.flows[Q.flow].steps.length} · ${J.title}${Q.finished?" · Complete":""}`:"No authored flows",document.getElementById("flow-story").textContent=J?.story||"",L9.uTraceNode.value=J?kJ.nodes.findIndex((Z)=>Z.id===J.to):-1,f$.forEach((Z,K)=>{Z.material.uniforms.uTrace.value=J?.route===K?1:0}),_9.visible=!!J,J){let Z=DW(kJ.routes[J.route].points,Q.progress);_9.position.set(Z.x,0.09,Z.z)}N8()}function L7(){cancelAnimationFrame(R7),R7=0,n8=null}function xW(J){if(R7=0,n8!==null)J9.tick(J-n8);if(n8=J,q8(),J9.state.playing)R7=requestAnimationFrame(xW);else n8=null}j$.addEventListener("change",()=>{L7(),J9.choose(Number(j$.value)),q8()});y$.addEventListener("click",()=>{if(J9.state.playing)J9.pause(),L7();else J9.play(),n8=null,R7=requestAnimationFrame(xW);q8()});document.getElementById("step").addEventListener("click",()=>{L7(),J9.step(),q8()});document.getElementById("restart-flow").addEventListener("click",()=>{L7(),J9.restart(),q8()});for(let J of document.querySelectorAll("[data-projection]"))J.addEventListener("click",()=>{EJ.projection=J.dataset.projection,document.querySelectorAll("[data-projection]").forEach((Q)=>Q.setAttribute("aria-pressed",String(Q.dataset.projection===EJ.projection))),document.getElementById("projection-note").textContent=EJ.projection==="flow"?"Atlas · Flow / top view":"Atlas · 2:1 dimetric",b$(x$())});document.addEventListener("visibilitychange",()=>{if(document.hidden)J9.pause(),L7(),q8()});for(let J of["flow-select","play","step","restart-flow"])document.getElementById(J).disabled=!kJ.flows?.length;fJ.addEventListener("change",N8);new ResizeObserver(vW).observe(G8);p$();bW("dark");vW();q8();window.AtlasPrism={renderer:i8,scene:U9,camera:WJ,controls:fJ,state:EJ,sceneBounds:w9,prismMaterial:_W,gridMaterial:wW,render:N8,playback:J9,routeMeshes:f$,flowDot:_9};})();
