(()=>{var MW="186",K9={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},x9={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},LW=0,d6=1,kW=2;var W7=1,VW=2,y8=3,f8=0,bJ=1,aJ=2,q9=0,K7=1,u6=2,c6=3,n6=4,BW=5;var h8=100,IW=101,zW=102,AW=103,CW=104,PW=200,wW=201,_W=202,TW=203,SW=204,jW=205,yW=206,fW=207,hW=208,vW=209,bW=210,xW=211,gW=212,pW=213,mW=214,lW=0,dW=1,uW=2,s6=3,cW=4,nW=5,sW=6,iW=7,oW=0,aW=1,rW=2,Z9=0,i6=1,o6=2,a6=3,r6=4,t6=5,e6=6,JQ=7;var v8=301,o9=302,l7=303,d7=304,Z7=306,tW=1000,u7=1001,eW=1002,g9=1003,JK=1004;var H7=1005;var xJ=1006,c7=1007;var a9=1008;var H9=1009,QK=1010,$K=1011,Y7=1012,QQ=1013,p9=1014,C9=1015,E9=1016,$Q=1017,WQ=1018,b8=1020,WK=35902,KK=35899,ZK=1021,HK=1022,F9=1023,r9=1026,t9=1027,YK=1028,KQ=1029,e9=1030,ZQ=1031;var HQ=1033,n7=33776,s7=33777,i7=33778,o7=33779,YQ=35840,XQ=35841,UQ=35842,GQ=35843,NQ=36196,qQ=37492,EQ=37496,FQ=37488,DQ=37489,a7=37490,OQ=37491,RQ=37808,MQ=37809,LQ=37810,kQ=37811,VQ=37812,BQ=37813,IQ=37814,zQ=37815,AQ=37816,CQ=37817,PQ=37818,wQ=37819,_Q=37820,TQ=37821,SQ=36492,jQ=36494,yQ=36495,fQ=36283,hQ=36284,r7=36285,vQ=36286;var bQ=0,XK=1,J8="",UK="srgb",xQ="srgb-linear",gQ="linear",JJ="srgb";var GK=512,NK=513,qK=514,t7=515,EK=516,FK=517,e7=518,DK=519;var pQ="300 es",mQ=2000;function xZ(J){for(let Q=J.length-1;Q>=0;--Q)if(J[Q]>=65535)return!0;return!1}function gZ(J){return ArrayBuffer.isView(J)&&!(J instanceof DataView)}function $7(J){return document.createElementNS("http://www.w3.org/1999/xhtml",J)}function OK(){let J=$7("canvas");return J.style.display="block",J}var a$={},S8=null;function lQ(...J){let Q="THREE."+J.shift();if(S8)S8("log",Q,...J);else console.log(Q,...J)}function RK(J){let Q=J[0];if(typeof Q==="string"&&Q.startsWith("TSL:")){let $=J[1];if($&&$.isStackTrace)J[0]+=" "+$.getLocation();else J[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return J}function P0(...J){J=RK(J);let Q="THREE."+J.shift();if(S8)S8("warn",Q,...J);else{let $=J[0];if($&&$.isStackTrace)console.warn($.getError(Q));else console.warn(Q,...J)}}function T0(...J){J=RK(J);let Q="THREE."+J.shift();if(S8)S8("error",Q,...J);else{let $=J[0];if($&&$.isStackTrace)console.error($.getError(Q));else console.error(Q,...J)}}function i9(...J){let Q=J.join(" ");if(Q in a$)return;a$[Q]=!0,P0(...J)}function MK(J,Q,$){return new Promise(function(W,K){function Z(){switch(J.clientWaitSync(Q,J.SYNC_FLUSH_COMMANDS_BIT,0)){case J.WAIT_FAILED:K();break;case J.TIMEOUT_EXPIRED:setTimeout(Z,$);break;default:W()}}setTimeout(Z,$)})}var LK={[0]:1,[2]:6,[4]:7,[3]:5,[1]:0,[6]:2,[7]:4,[5]:3};class D9{addEventListener(J,Q){if(this._listeners===void 0)this._listeners={};let $=this._listeners;if($[J]===void 0)$[J]=[];if($[J].indexOf(Q)===-1)$[J].push(Q)}hasEventListener(J,Q){let $=this._listeners;if($===void 0)return!1;return $[J]!==void 0&&$[J].indexOf(Q)!==-1}removeEventListener(J,Q){let $=this._listeners;if($===void 0)return;let W=$[J];if(W!==void 0){let K=W.indexOf(Q);if(K!==-1)W.splice(K,1)}}dispatchEvent(J){let Q=this._listeners;if(Q===void 0)return;let $=Q[J.type];if($!==void 0){J.target=this;let W=$.slice(0);for(let K=0,Z=W.length;K<Z;K++)W[K].call(this,J);J.target=null}}}var CJ=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],r$=1234567,J7=Math.PI/180,j8=180/Math.PI;function x8(){let J=Math.random()*4294967295|0,Q=Math.random()*4294967295|0,$=Math.random()*4294967295|0,W=Math.random()*4294967295|0;return(CJ[J&255]+CJ[J>>8&255]+CJ[J>>16&255]+CJ[J>>24&255]+"-"+CJ[Q&255]+CJ[Q>>8&255]+"-"+CJ[Q>>16&15|64]+CJ[Q>>24&255]+"-"+CJ[$&63|128]+CJ[$>>8&255]+"-"+CJ[$>>16&255]+CJ[$>>24&255]+CJ[W&255]+CJ[W>>8&255]+CJ[W>>16&255]+CJ[W>>24&255]).toLowerCase()}function b0(J,Q,$){return Math.max(Q,Math.min($,J))}function dQ(J,Q){return(J%Q+Q)%Q}function pZ(J,Q,$,W,K){return W+(J-Q)*(K-W)/($-Q)}function mZ(J,Q,$){if(J!==Q)return($-J)/(Q-J);else return 0}function Q7(J,Q,$){return(1-$)*J+$*Q}function lZ(J,Q,$,W){return Q7(J,Q,1-Math.exp(-$*W))}function dZ(J,Q=1){return Q-Math.abs(dQ(J,Q*2)-Q)}function uZ(J,Q,$){if(J<=Q)return 0;if(J>=$)return 1;return J=(J-Q)/($-Q),J*J*(3-2*J)}function cZ(J,Q,$){if(J<=Q)return 0;if(J>=$)return 1;return J=(J-Q)/($-Q),J*J*J*(J*(J*6-15)+10)}function nZ(J,Q){return J+Math.floor(Math.random()*(Q-J+1))}function sZ(J,Q){return J+Math.random()*(Q-J)}function iZ(J){return J*(0.5-Math.random())}function oZ(J){if(J!==void 0)r$=J;let Q=r$+=1831565813;return Q=Math.imul(Q^Q>>>15,Q|1),Q^=Q+Math.imul(Q^Q>>>7,Q|61),((Q^Q>>>14)>>>0)/4294967296}function aZ(J){return J*J7}function rZ(J){return J*j8}function tZ(J){return J>0&&Number.isInteger(J)&&2**Math.round(Math.log2(J))===J}function eZ(J){return Math.pow(2,Math.ceil(Math.log(J)/Math.LN2))}function JH(J){return Math.pow(2,Math.floor(Math.log(J)/Math.LN2))}function QH(J,Q,$,W,K){let{cos:Z,sin:H}=Math,Y=Z($/2),X=H($/2),U=Z((Q+W)/2),N=H((Q+W)/2),E=Z((Q-W)/2),G=H((Q-W)/2),F=Z((W-Q)/2),L=H((W-Q)/2);switch(K){case"XYX":J.set(Y*N,X*E,X*G,Y*U);break;case"YZY":J.set(X*G,Y*N,X*E,Y*U);break;case"ZXZ":J.set(X*E,X*G,Y*N,Y*U);break;case"XZX":J.set(Y*N,X*L,X*F,Y*U);break;case"YXY":J.set(X*F,Y*N,X*L,Y*U);break;case"ZYZ":J.set(X*L,X*F,Y*N,Y*U);break;default:P0("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+K)}}function w8(J,Q){switch(Q.constructor){case Float32Array:return J;case Uint32Array:return J/4294967295;case Uint16Array:return J/65535;case Uint8Array:case Uint8ClampedArray:return J/255;case Int32Array:return Math.max(J/2147483647,-1);case Int16Array:return Math.max(J/32767,-1);case Int8Array:return Math.max(J/127,-1);default:throw Error("THREE.MathUtils: Invalid component type.")}}function yJ(J,Q){switch(Q.constructor){case Float32Array:return J;case Uint32Array:return Math.round(J*4294967295);case Uint16Array:return Math.round(J*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(J*255);case Int32Array:return Math.round(J*2147483647);case Int16Array:return Math.round(J*32767);case Int8Array:return Math.round(J*127);default:throw Error("THREE.MathUtils: Invalid component type.")}}var uQ={DEG2RAD:J7,RAD2DEG:j8,generateUUID:x8,clamp:b0,euclideanModulo:dQ,mapLinear:pZ,inverseLerp:mZ,lerp:Q7,damp:lZ,pingpong:dZ,smoothstep:uZ,smootherstep:cZ,randInt:nZ,randFloat:sZ,randFloatSpread:iZ,seededRandom:oZ,degToRad:aZ,radToDeg:rZ,isPowerOfTwo:tZ,ceilPowerOfTwo:eZ,floorPowerOfTwo:JH,setQuaternionFromProperEuler:QH,normalize:yJ,denormalize:w8};class S0{static{S0.prototype.isVector2=!0}constructor(J=0,Q=0){this.x=J,this.y=Q}get width(){return this.x}set width(J){this.x=J}get height(){return this.y}set height(J){this.y=J}set(J,Q){return this.x=J,this.y=Q,this}setScalar(J){return this.x=J,this.y=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;default:throw Error("THREE.Vector2: index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;default:throw Error("THREE.Vector2: index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y)}copy(J){return this.x=J.x,this.y=J.y,this}add(J){return this.x+=J.x,this.y+=J.y,this}addScalar(J){return this.x+=J,this.y+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this}subScalar(J){return this.x-=J,this.y-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this}multiply(J){return this.x*=J.x,this.y*=J.y,this}multiplyScalar(J){return this.x*=J,this.y*=J,this}divide(J){return this.x/=J.x,this.y/=J.y,this}divideScalar(J){return this.multiplyScalar(1/J)}applyMatrix3(J){let Q=this.x,$=this.y,W=J.elements;return this.x=W[0]*Q+W[3]*$+W[6],this.y=W[1]*Q+W[4]*$+W[7],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this}clamp(J,Q){return this.x=b0(this.x,J.x,Q.x),this.y=b0(this.y,J.y,Q.y),this}clampScalar(J,Q){return this.x=b0(this.x,J,Q),this.y=b0(this.y,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(b0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(J){return this.x*J.x+this.y*J.y}cross(J){return this.x*J.y-this.y*J.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(J){let Q=Math.sqrt(this.lengthSq()*J.lengthSq());if(Q===0)return Math.PI/2;let $=this.dot(J)/Q;return Math.acos(b0($,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let Q=this.x-J.x,$=this.y-J.y;return Q*Q+$*$}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this}equals(J){return J.x===this.x&&J.y===this.y}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this}rotateAround(J,Q){let $=Math.cos(Q),W=Math.sin(Q),K=this.x-J.x,Z=this.y-J.y;return this.x=K*$-Z*W+J.x,this.y=K*W+Z*$+J.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class rJ{constructor(J=0,Q=0,$=0,W=1){this.isQuaternion=!0,this._x=J,this._y=Q,this._z=$,this._w=W}static slerpFlat(J,Q,$,W,K,Z,H){let Y=$[W+0],X=$[W+1],U=$[W+2],N=$[W+3],E=K[Z+0],G=K[Z+1],F=K[Z+2],L=K[Z+3];if(N!==L||Y!==E||X!==G||U!==F){let I=Y*E+X*G+U*F+N*L;if(I<0)E=-E,G=-G,F=-F,L=-L,I=-I;let D=1-H;if(I<0.9995){let q=Math.acos(I),A=Math.sin(q);D=Math.sin(D*q)/A,H=Math.sin(H*q)/A,Y=Y*D+E*H,X=X*D+G*H,U=U*D+F*H,N=N*D+L*H}else{Y=Y*D+E*H,X=X*D+G*H,U=U*D+F*H,N=N*D+L*H;let q=1/Math.sqrt(Y*Y+X*X+U*U+N*N);Y*=q,X*=q,U*=q,N*=q}}J[Q]=Y,J[Q+1]=X,J[Q+2]=U,J[Q+3]=N}static multiplyQuaternionsFlat(J,Q,$,W,K,Z){let H=$[W],Y=$[W+1],X=$[W+2],U=$[W+3],N=K[Z],E=K[Z+1],G=K[Z+2],F=K[Z+3];return J[Q]=H*F+U*N+Y*G-X*E,J[Q+1]=Y*F+U*E+X*N-H*G,J[Q+2]=X*F+U*G+H*E-Y*N,J[Q+3]=U*F-H*N-Y*E-X*G,J}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get w(){return this._w}set w(J){this._w=J,this._onChangeCallback()}set(J,Q,$,W){return this._x=J,this._y=Q,this._z=$,this._w=W,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(J){return this._x=J.x,this._y=J.y,this._z=J.z,this._w=J.w,this._onChangeCallback(),this}setFromEuler(J,Q=!0){let{_x:$,_y:W,_z:K,_order:Z}=J,H=Math.cos,Y=Math.sin,X=H($/2),U=H(W/2),N=H(K/2),E=Y($/2),G=Y(W/2),F=Y(K/2);switch(Z){case"XYZ":this._x=E*U*N+X*G*F,this._y=X*G*N-E*U*F,this._z=X*U*F+E*G*N,this._w=X*U*N-E*G*F;break;case"YXZ":this._x=E*U*N+X*G*F,this._y=X*G*N-E*U*F,this._z=X*U*F-E*G*N,this._w=X*U*N+E*G*F;break;case"ZXY":this._x=E*U*N-X*G*F,this._y=X*G*N+E*U*F,this._z=X*U*F+E*G*N,this._w=X*U*N-E*G*F;break;case"ZYX":this._x=E*U*N-X*G*F,this._y=X*G*N+E*U*F,this._z=X*U*F-E*G*N,this._w=X*U*N+E*G*F;break;case"YZX":this._x=E*U*N+X*G*F,this._y=X*G*N+E*U*F,this._z=X*U*F-E*G*N,this._w=X*U*N-E*G*F;break;case"XZY":this._x=E*U*N-X*G*F,this._y=X*G*N-E*U*F,this._z=X*U*F+E*G*N,this._w=X*U*N+E*G*F;break;default:P0("Quaternion: .setFromEuler() encountered an unknown order: "+Z)}if(Q===!0)this._onChangeCallback();return this}setFromAxisAngle(J,Q){let $=Q/2,W=Math.sin($);return this._x=J.x*W,this._y=J.y*W,this._z=J.z*W,this._w=Math.cos($),this._onChangeCallback(),this}setFromRotationMatrix(J){let Q=J.elements,$=Q[0],W=Q[4],K=Q[8],Z=Q[1],H=Q[5],Y=Q[9],X=Q[2],U=Q[6],N=Q[10],E=$+H+N;if(E>0){let G=0.5/Math.sqrt(E+1);this._w=0.25/G,this._x=(U-Y)*G,this._y=(K-X)*G,this._z=(Z-W)*G}else if($>H&&$>N){let G=2*Math.sqrt(1+$-H-N);this._w=(U-Y)/G,this._x=0.25*G,this._y=(W+Z)/G,this._z=(K+X)/G}else if(H>N){let G=2*Math.sqrt(1+H-$-N);this._w=(K-X)/G,this._x=(W+Z)/G,this._y=0.25*G,this._z=(Y+U)/G}else{let G=2*Math.sqrt(1+N-$-H);this._w=(Z-W)/G,this._x=(K+X)/G,this._y=(Y+U)/G,this._z=0.25*G}return this._onChangeCallback(),this}setFromUnitVectors(J,Q){let $=J.dot(Q)+1;if($<0.00000001)if($=0,Math.abs(J.x)>Math.abs(J.z))this._x=-J.y,this._y=J.x,this._z=0,this._w=$;else this._x=0,this._y=-J.z,this._z=J.y,this._w=$;else this._x=J.y*Q.z-J.z*Q.y,this._y=J.z*Q.x-J.x*Q.z,this._z=J.x*Q.y-J.y*Q.x,this._w=$;return this.normalize()}angleTo(J){return 2*Math.acos(Math.abs(b0(this.dot(J),-1,1)))}rotateTowards(J,Q){let $=this.angleTo(J);if($===0)return this;let W=Math.min(1,Q/$);return this.slerp(J,W),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(J){return this._x*J._x+this._y*J._y+this._z*J._z+this._w*J._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let J=this.length();if(J===0)this._x=0,this._y=0,this._z=0,this._w=1;else J=1/J,this._x=this._x*J,this._y=this._y*J,this._z=this._z*J,this._w=this._w*J;return this._onChangeCallback(),this}multiply(J){return this.multiplyQuaternions(this,J)}premultiply(J){return this.multiplyQuaternions(J,this)}multiplyQuaternions(J,Q){let{_x:$,_y:W,_z:K,_w:Z}=J,H=Q._x,Y=Q._y,X=Q._z,U=Q._w;return this._x=$*U+Z*H+W*X-K*Y,this._y=W*U+Z*Y+K*H-$*X,this._z=K*U+Z*X+$*Y-W*H,this._w=Z*U-$*H-W*Y-K*X,this._onChangeCallback(),this}slerp(J,Q){let{_x:$,_y:W,_z:K,_w:Z}=J,H=this.dot(J);if(H<0)$=-$,W=-W,K=-K,Z=-Z,H=-H;let Y=1-Q;if(H<0.9995){let X=Math.acos(H),U=Math.sin(X);Y=Math.sin(Y*X)/U,Q=Math.sin(Q*X)/U,this._x=this._x*Y+$*Q,this._y=this._y*Y+W*Q,this._z=this._z*Y+K*Q,this._w=this._w*Y+Z*Q,this._onChangeCallback()}else this._x=this._x*Y+$*Q,this._y=this._y*Y+W*Q,this._z=this._z*Y+K*Q,this._w=this._w*Y+Z*Q,this.normalize();return this}slerpQuaternions(J,Q,$){return this.copy(J).slerp(Q,$)}random(){let J=2*Math.PI*Math.random(),Q=2*Math.PI*Math.random(),$=Math.random(),W=Math.sqrt(1-$),K=Math.sqrt($);return this.set(W*Math.sin(J),W*Math.cos(J),K*Math.sin(Q),K*Math.cos(Q))}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._w===this._w}fromArray(J,Q=0){return this._x=J[Q],this._y=J[Q+1],this._z=J[Q+2],this._w=J[Q+3],this._onChangeCallback(),this}toArray(J=[],Q=0){return J[Q]=this._x,J[Q+1]=this._y,J[Q+2]=this._z,J[Q+3]=this._w,J}fromBufferAttribute(J,Q){return this._x=J.getX(Q),this._y=J.getY(Q),this._z=J.getZ(Q),this._w=J.getW(Q),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class f{static{f.prototype.isVector3=!0}constructor(J=0,Q=0,$=0){this.x=J,this.y=Q,this.z=$}set(J,Q,$){if($===void 0)$=this.z;return this.x=J,this.y=Q,this.z=$,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;case 2:this.z=Q;break;default:throw Error("THREE.Vector3: index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("THREE.Vector3: index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this.z=J.z+Q.z,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this.z+=J.z*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this.z=J.z-Q.z,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this}multiplyVectors(J,Q){return this.x=J.x*Q.x,this.y=J.y*Q.y,this.z=J.z*Q.z,this}applyEuler(J){return this.applyQuaternion(t$.setFromEuler(J))}applyAxisAngle(J,Q){return this.applyQuaternion(t$.setFromAxisAngle(J,Q))}applyMatrix3(J){let Q=this.x,$=this.y,W=this.z,K=J.elements;return this.x=K[0]*Q+K[3]*$+K[6]*W,this.y=K[1]*Q+K[4]*$+K[7]*W,this.z=K[2]*Q+K[5]*$+K[8]*W,this}applyNormalMatrix(J){return this.applyMatrix3(J).normalize()}applyMatrix4(J){let Q=this.x,$=this.y,W=this.z,K=J.elements,Z=1/(K[3]*Q+K[7]*$+K[11]*W+K[15]);return this.x=(K[0]*Q+K[4]*$+K[8]*W+K[12])*Z,this.y=(K[1]*Q+K[5]*$+K[9]*W+K[13])*Z,this.z=(K[2]*Q+K[6]*$+K[10]*W+K[14])*Z,this}applyQuaternion(J){let Q=this.x,$=this.y,W=this.z,K=J.x,Z=J.y,H=J.z,Y=J.w,X=2*(Z*W-H*$),U=2*(H*Q-K*W),N=2*(K*$-Z*Q);return this.x=Q+Y*X+Z*N-H*U,this.y=$+Y*U+H*X-K*N,this.z=W+Y*N+K*U-Z*X,this}project(J){return this.applyMatrix4(J.matrixWorldInverse).applyMatrix4(J.projectionMatrix)}unproject(J){return this.applyMatrix4(J.projectionMatrixInverse).applyMatrix4(J.matrixWorld)}transformDirection(J){let Q=this.x,$=this.y,W=this.z,K=J.elements;return this.x=K[0]*Q+K[4]*$+K[8]*W,this.y=K[1]*Q+K[5]*$+K[9]*W,this.z=K[2]*Q+K[6]*$+K[10]*W,this.normalize()}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this}divideScalar(J){return this.multiplyScalar(1/J)}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this}clamp(J,Q){return this.x=b0(this.x,J.x,Q.x),this.y=b0(this.y,J.y,Q.y),this.z=b0(this.z,J.z,Q.z),this}clampScalar(J,Q){return this.x=b0(this.x,J,Q),this.y=b0(this.y,J,Q),this.z=b0(this.z,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(b0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this.z+=(J.z-this.z)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this.z=J.z+(Q.z-J.z)*$,this}cross(J){return this.crossVectors(this,J)}crossVectors(J,Q){let{x:$,y:W,z:K}=J,Z=Q.x,H=Q.y,Y=Q.z;return this.x=W*Y-K*H,this.y=K*Z-$*Y,this.z=$*H-W*Z,this}projectOnVector(J){let Q=J.lengthSq();if(Q===0)return this.set(0,0,0);let $=J.dot(this)/Q;return this.copy(J).multiplyScalar($)}projectOnPlane(J){return B6.copy(this).projectOnVector(J),this.sub(B6)}reflect(J){return this.sub(B6.copy(J).multiplyScalar(2*this.dot(J)))}angleTo(J){let Q=Math.sqrt(this.lengthSq()*J.lengthSq());if(Q===0)return Math.PI/2;let $=this.dot(J)/Q;return Math.acos(b0($,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let Q=this.x-J.x,$=this.y-J.y,W=this.z-J.z;return Q*Q+$*$+W*W}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)+Math.abs(this.z-J.z)}setFromSpherical(J){return this.setFromSphericalCoords(J.radius,J.phi,J.theta)}setFromSphericalCoords(J,Q,$){let W=Math.sin(Q)*J;return this.x=W*Math.sin($),this.y=Math.cos(Q)*J,this.z=W*Math.cos($),this}setFromCylindrical(J){return this.setFromCylindricalCoords(J.radius,J.theta,J.y)}setFromCylindricalCoords(J,Q,$){return this.x=J*Math.sin(Q),this.y=$,this.z=J*Math.cos(Q),this}setFromMatrixPosition(J){let Q=J.elements;return this.x=Q[12],this.y=Q[13],this.z=Q[14],this}setFromMatrixScale(J){let Q=this.setFromMatrixColumn(J,0).length(),$=this.setFromMatrixColumn(J,1).length(),W=this.setFromMatrixColumn(J,2).length();return this.x=Q,this.y=$,this.z=W,this}setFromMatrixColumn(J,Q){return this.fromArray(J.elements,Q*4)}setFromMatrix3Column(J,Q){return this.fromArray(J.elements,Q*3)}setFromEuler(J){return this.x=J._x,this.y=J._y,this.z=J._z,this}setFromColor(J){return this.x=J.r,this.y=J.g,this.z=J.b,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this.z=J[Q+2],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J[Q+2]=this.z,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this.z=J.getZ(Q),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let J=Math.random()*Math.PI*2,Q=Math.random()*2-1,$=Math.sqrt(1-Q*Q);return this.x=$*Math.cos(J),this.y=Q,this.z=$*Math.sin(J),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}var B6=new f,t$=new rJ;class j0{static{j0.prototype.isMatrix3=!0}constructor(J,Q,$,W,K,Z,H,Y,X){if(this.elements=[1,0,0,0,1,0,0,0,1],J!==void 0)this.set(J,Q,$,W,K,Z,H,Y,X)}set(J,Q,$,W,K,Z,H,Y,X){let U=this.elements;return U[0]=J,U[1]=W,U[2]=H,U[3]=Q,U[4]=K,U[5]=Y,U[6]=$,U[7]=Z,U[8]=X,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(J){let Q=this.elements,$=J.elements;return Q[0]=$[0],Q[1]=$[1],Q[2]=$[2],Q[3]=$[3],Q[4]=$[4],Q[5]=$[5],Q[6]=$[6],Q[7]=$[7],Q[8]=$[8],this}extractBasis(J,Q,$){return J.setFromMatrix3Column(this,0),Q.setFromMatrix3Column(this,1),$.setFromMatrix3Column(this,2),this}setFromMatrix4(J){let Q=J.elements;return this.set(Q[0],Q[4],Q[8],Q[1],Q[5],Q[9],Q[2],Q[6],Q[10]),this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,Q){let $=J.elements,W=Q.elements,K=this.elements,Z=$[0],H=$[3],Y=$[6],X=$[1],U=$[4],N=$[7],E=$[2],G=$[5],F=$[8],L=W[0],I=W[3],D=W[6],q=W[1],A=W[4],y=W[7],V=W[2],z=W[5],C=W[8];return K[0]=Z*L+H*q+Y*V,K[3]=Z*I+H*A+Y*z,K[6]=Z*D+H*y+Y*C,K[1]=X*L+U*q+N*V,K[4]=X*I+U*A+N*z,K[7]=X*D+U*y+N*C,K[2]=E*L+G*q+F*V,K[5]=E*I+G*A+F*z,K[8]=E*D+G*y+F*C,this}multiplyScalar(J){let Q=this.elements;return Q[0]*=J,Q[3]*=J,Q[6]*=J,Q[1]*=J,Q[4]*=J,Q[7]*=J,Q[2]*=J,Q[5]*=J,Q[8]*=J,this}determinant(){let J=this.elements,Q=J[0],$=J[1],W=J[2],K=J[3],Z=J[4],H=J[5],Y=J[6],X=J[7],U=J[8];return Q*Z*U-Q*H*X-$*K*U+$*H*Y+W*K*X-W*Z*Y}invert(){let J=this.elements,Q=J[0],$=J[1],W=J[2],K=J[3],Z=J[4],H=J[5],Y=J[6],X=J[7],U=J[8],N=U*Z-H*X,E=H*Y-U*K,G=X*K-Z*Y,F=Q*N+$*E+W*G;if(F===0)return this.set(0,0,0,0,0,0,0,0,0);let L=1/F;return J[0]=N*L,J[1]=(W*X-U*$)*L,J[2]=(H*$-W*Z)*L,J[3]=E*L,J[4]=(U*Q-W*Y)*L,J[5]=(W*K-H*Q)*L,J[6]=G*L,J[7]=($*Y-X*Q)*L,J[8]=(Z*Q-$*K)*L,this}transpose(){let J,Q=this.elements;return J=Q[1],Q[1]=Q[3],Q[3]=J,J=Q[2],Q[2]=Q[6],Q[6]=J,J=Q[5],Q[5]=Q[7],Q[7]=J,this}getNormalMatrix(J){return this.setFromMatrix4(J).invert().transpose()}transposeIntoArray(J){let Q=this.elements;return J[0]=Q[0],J[1]=Q[3],J[2]=Q[6],J[3]=Q[1],J[4]=Q[4],J[5]=Q[7],J[6]=Q[2],J[7]=Q[5],J[8]=Q[8],this}setUvTransform(J,Q,$,W,K,Z,H){let Y=Math.cos(K),X=Math.sin(K);return this.set($*Y,$*X,-$*(Y*Z+X*H)+Z+J,-W*X,W*Y,-W*(-X*Z+Y*H)+H+Q,0,0,1),this}scale(J,Q){return i9("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(I6.makeScale(J,Q)),this}rotate(J){return i9("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(I6.makeRotation(-J)),this}translate(J,Q){return i9("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(I6.makeTranslation(J,Q)),this}makeTranslation(J,Q){if(J.isVector2)this.set(1,0,J.x,0,1,J.y,0,0,1);else this.set(1,0,J,0,1,Q,0,0,1);return this}makeRotation(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,-$,0,$,Q,0,0,0,1),this}makeScale(J,Q){return this.set(J,0,0,0,Q,0,0,0,1),this}equals(J){let Q=this.elements,$=J.elements;for(let W=0;W<9;W++)if(Q[W]!==$[W])return!1;return!0}fromArray(J,Q=0){for(let $=0;$<9;$++)this.elements[$]=J[$+Q];return this}toArray(J=[],Q=0){let $=this.elements;return J[Q]=$[0],J[Q+1]=$[1],J[Q+2]=$[2],J[Q+3]=$[3],J[Q+4]=$[4],J[Q+5]=$[5],J[Q+6]=$[6],J[Q+7]=$[7],J[Q+8]=$[8],J}clone(){return new this.constructor().fromArray(this.elements)}}var I6=new j0,e$=new j0().set(0.4123908,0.3575843,0.1804808,0.212639,0.7151687,0.0721923,0.0193308,0.1191948,0.9505322),JW=new j0().set(3.2409699,-1.5373832,-0.4986108,-0.9692436,1.8759675,0.0415551,0.0556301,-0.203977,1.0569715);function $H(){let J={enabled:!0,workingColorSpace:"srgb-linear",spaces:{},convert:function(K,Z,H){if(this.enabled===!1||Z===H||!Z||!H)return K;if(this.spaces[Z].transfer==="srgb")K.r=A9(K.r),K.g=A9(K.g),K.b=A9(K.b);if(this.spaces[Z].primaries!==this.spaces[H].primaries)K.applyMatrix3(this.spaces[Z].toXYZ),K.applyMatrix3(this.spaces[H].fromXYZ);if(this.spaces[H].transfer==="srgb")K.r=T8(K.r),K.g=T8(K.g),K.b=T8(K.b);return K},workingToColorSpace:function(K,Z){return this.convert(K,this.workingColorSpace,Z)},colorSpaceToWorking:function(K,Z){return this.convert(K,Z,this.workingColorSpace)},getPrimaries:function(K){return this.spaces[K].primaries},getTransfer:function(K){if(K==="")return"linear";return this.spaces[K].transfer},getToneMappingMode:function(K){return this.spaces[K].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(K,Z=this.workingColorSpace){return K.fromArray(this.spaces[Z].luminanceCoefficients)},define:function(K){Object.assign(this.spaces,K)},_getMatrix:function(K,Z,H){return K.copy(this.spaces[Z].toXYZ).multiply(this.spaces[H].fromXYZ)},_getDrawingBufferColorSpace:function(K){return this.spaces[K].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(K=this.workingColorSpace){return this.spaces[K].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(K,Z){return i9("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),J.workingToColorSpace(K,Z)},toWorkingColorSpace:function(K,Z){return i9("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),J.colorSpaceToWorking(K,Z)}},Q=[0.64,0.33,0.3,0.6,0.15,0.06],$=[0.2126,0.7152,0.0722],W=[0.3127,0.329];return J.define({["srgb-linear"]:{primaries:Q,whitePoint:W,transfer:"linear",toXYZ:e$,fromXYZ:JW,luminanceCoefficients:$,workingColorSpaceConfig:{unpackColorSpace:"srgb"},outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}},["srgb"]:{primaries:Q,whitePoint:W,transfer:"srgb",toXYZ:e$,fromXYZ:JW,luminanceCoefficients:$,outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}}}),J}var m0=$H();function A9(J){return J<0.04045?J*0.0773993808:Math.pow(J*0.9478672986+0.0521327014,2.4)}function T8(J){return J<0.0031308?J*12.92:1.055*Math.pow(J,0.41666)-0.055}var D8;class cQ{static getDataURL(J,Q="image/png"){if(/^data:/i.test(J.src))return J.src;if(typeof HTMLCanvasElement>"u")return J.src;let $;if(J instanceof HTMLCanvasElement)$=J;else{if(D8===void 0)D8=$7("canvas");D8.width=J.width,D8.height=J.height;let W=D8.getContext("2d");if(J instanceof ImageData)W.putImageData(J,0,0);else W.drawImage(J,0,0,J.width,J.height);$=D8}return $.toDataURL(Q)}static sRGBToLinear(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap){let Q=$7("canvas");Q.width=J.width,Q.height=J.height;let $=Q.getContext("2d");$.drawImage(J,0,0,J.width,J.height);let W=$.getImageData(0,0,J.width,J.height),K=W.data;for(let Z=0;Z<K.length;Z++)K[Z]=A9(K[Z]/255)*255;return $.putImageData(W,0,0),Q}else if(J.data){let Q=J.data.slice(0);for(let $=0;$<Q.length;$++)if(Q instanceof Uint8Array||Q instanceof Uint8ClampedArray)Q[$]=Math.floor(A9(Q[$]/255)*255);else Q[$]=A9(Q[$]);return{data:Q,width:J.width,height:J.height}}else return P0("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),J}}var WH=0;class X7{constructor(J=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:WH++}),this.uuid=x8(),this.data=J,this.dataReady=!0,this.version=0}getSize(J){let Q=this.data;if(typeof HTMLVideoElement<"u"&&Q instanceof HTMLVideoElement)J.set(Q.videoWidth,Q.videoHeight,0);else if(typeof VideoFrame<"u"&&Q instanceof VideoFrame)J.set(Q.displayWidth,Q.displayHeight,0);else if(Q!==null)J.set(Q.width,Q.height,Q.depth||0);else J.set(0,0,0);return J}set needsUpdate(J){if(J===!0)this.version++}toJSON(J){let Q=J===void 0||typeof J==="string";if(!Q&&J.images[this.uuid]!==void 0)return J.images[this.uuid];let $={uuid:this.uuid,url:""},W=this.data;if(W!==null){let K;if(Array.isArray(W)){K=[];for(let Z=0,H=W.length;Z<H;Z++)if(W[Z].isDataTexture)K.push(z6(W[Z].image));else K.push(z6(W[Z]))}else K=z6(W);$.url=K}if(!Q)J.images[this.uuid]=$;return $}}function z6(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap)return cQ.getDataURL(J);else if(J.data)return{data:Array.from(J.data),width:J.width,height:J.height,type:J.data.constructor.name};else return P0("Texture: Unable to serialize Texture."),{}}var KH=0,A6=new f;class wJ extends D9{constructor(J=wJ.DEFAULT_IMAGE,Q=wJ.DEFAULT_MAPPING,$=1001,W=1001,K=1006,Z=1008,H=1023,Y=1009,X=wJ.DEFAULT_ANISOTROPY,U=""){super();this.isTexture=!0,Object.defineProperty(this,"id",{value:KH++}),this.uuid=x8(),this.name="",this.source=new X7(J),this.mipmaps=[],this.mapping=Q,this.channel=0,this.wrapS=$,this.wrapT=W,this.magFilter=K,this.minFilter=Z,this.anisotropy=X,this.format=H,this.internalFormat=null,this.type=Y,this.offset=new S0(0,0),this.repeat=new S0(1,1),this.center=new S0(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new j0,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=U,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=J&&J.depth&&J.depth>1?!0:!1,this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(A6).x}get height(){return this.source.getSize(A6).y}get depth(){return this.source.getSize(A6).z}get image(){return this.source.data}set image(J){this.source.data=J}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(J){return this.name=J.name,this.source=J.source,this.mipmaps=J.mipmaps.slice(0),this.mapping=J.mapping,this.channel=J.channel,this.wrapS=J.wrapS,this.wrapT=J.wrapT,this.magFilter=J.magFilter,this.minFilter=J.minFilter,this.anisotropy=J.anisotropy,this.format=J.format,this.internalFormat=J.internalFormat,this.type=J.type,this.normalized=J.normalized,this.offset.copy(J.offset),this.repeat.copy(J.repeat),this.center.copy(J.center),this.rotation=J.rotation,this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrix.copy(J.matrix),this.generateMipmaps=J.generateMipmaps,this.premultiplyAlpha=J.premultiplyAlpha,this.flipY=J.flipY,this.unpackAlignment=J.unpackAlignment,this.colorSpace=J.colorSpace,this.renderTarget=J.renderTarget,this.isRenderTargetTexture=J.isRenderTargetTexture,this.isArrayTexture=J.isArrayTexture,this.userData=JSON.parse(JSON.stringify(J.userData)),this.needsUpdate=!0,this}setValues(J){for(let Q in J){let $=J[Q];if($===void 0){P0(`Texture.setValues(): parameter '${Q}' has value of undefined.`);continue}let W=this[Q];if(W===void 0){P0(`Texture.setValues(): property '${Q}' does not exist.`);continue}if(W&&$&&(W.isVector2&&$.isVector2))W.copy($);else if(W&&$&&(W.isVector3&&$.isVector3))W.copy($);else if(W&&$&&(W.isMatrix3&&$.isMatrix3))W.copy($);else this[Q]=$}}toJSON(J){let Q=J===void 0||typeof J==="string";if(!Q&&J.textures[this.uuid]!==void 0)return J.textures[this.uuid];let $={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(J).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(Object.keys(this.userData).length>0)$.userData=this.userData;if(!Q)J.textures[this.uuid]=$;return $}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(J){if(this.mapping!==300)return J;if(J.applyMatrix3(this.matrix),J.x<0||J.x>1)switch(this.wrapS){case 1000:J.x=J.x-Math.floor(J.x);break;case 1001:J.x=J.x<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.x)%2)===1)J.x=Math.ceil(J.x)-J.x;else J.x=J.x-Math.floor(J.x);break}if(J.y<0||J.y>1)switch(this.wrapT){case 1000:J.y=J.y-Math.floor(J.y);break;case 1001:J.y=J.y<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.y)%2)===1)J.y=Math.ceil(J.y)-J.y;else J.y=J.y-Math.floor(J.y);break}if(this.flipY)J.y=1-J.y;return J}set needsUpdate(J){if(J===!0)this.version++,this.source.needsUpdate=!0}set needsPMREMUpdate(J){if(J===!0)this.pmremVersion++}}wJ.DEFAULT_IMAGE=null;wJ.DEFAULT_MAPPING=300;wJ.DEFAULT_ANISOTROPY=1;class UJ{static{UJ.prototype.isVector4=!0}constructor(J=0,Q=0,$=0,W=1){this.x=J,this.y=Q,this.z=$,this.w=W}get width(){return this.z}set width(J){this.z=J}get height(){return this.w}set height(J){this.w=J}set(J,Q,$,W){return this.x=J,this.y=Q,this.z=$,this.w=W,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this.w=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setW(J){return this.w=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;case 2:this.z=Q;break;case 3:this.w=Q;break;default:throw Error("THREE.Vector4: index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("THREE.Vector4: index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this.w=J.w!==void 0?J.w:1,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this.w+=J.w,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this.w+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this.z=J.z+Q.z,this.w=J.w+Q.w,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this.z+=J.z*Q,this.w+=J.w*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this.w-=J.w,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this.w-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this.z=J.z-Q.z,this.w=J.w-Q.w,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this.w*=J.w,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this.w*=J,this}applyMatrix4(J){let Q=this.x,$=this.y,W=this.z,K=this.w,Z=J.elements;return this.x=Z[0]*Q+Z[4]*$+Z[8]*W+Z[12]*K,this.y=Z[1]*Q+Z[5]*$+Z[9]*W+Z[13]*K,this.z=Z[2]*Q+Z[6]*$+Z[10]*W+Z[14]*K,this.w=Z[3]*Q+Z[7]*$+Z[11]*W+Z[15]*K,this}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this.w/=J.w,this}divideScalar(J){return this.multiplyScalar(1/J)}setAxisAngleFromQuaternion(J){this.w=2*Math.acos(J.w);let Q=Math.sqrt(1-J.w*J.w);if(Q<0.0001)this.x=1,this.y=0,this.z=0;else this.x=J.x/Q,this.y=J.y/Q,this.z=J.z/Q;return this}setAxisAngleFromRotationMatrix(J){let Q,$,W,K,Z=0.01,H=0.1,Y=J.elements,X=Y[0],U=Y[4],N=Y[8],E=Y[1],G=Y[5],F=Y[9],L=Y[2],I=Y[6],D=Y[10];if(Math.abs(U-E)<0.01&&Math.abs(N-L)<0.01&&Math.abs(F-I)<0.01){if(Math.abs(U+E)<0.1&&Math.abs(N+L)<0.1&&Math.abs(F+I)<0.1&&Math.abs(X+G+D-3)<0.1)return this.set(1,0,0,0),this;Q=Math.PI;let A=(X+1)/2,y=(G+1)/2,V=(D+1)/2,z=(U+E)/4,C=(N+L)/4,P=(F+I)/4;if(A>y&&A>V)if(A<0.01)$=0,W=0.707106781,K=0.707106781;else $=Math.sqrt(A),W=z/$,K=C/$;else if(y>V)if(y<0.01)$=0.707106781,W=0,K=0.707106781;else W=Math.sqrt(y),$=z/W,K=P/W;else if(V<0.01)$=0.707106781,W=0.707106781,K=0;else K=Math.sqrt(V),$=C/K,W=P/K;return this.set($,W,K,Q),this}let q=Math.sqrt((I-F)*(I-F)+(N-L)*(N-L)+(E-U)*(E-U));if(Math.abs(q)<0.001)q=1;return this.x=(I-F)/q,this.y=(N-L)/q,this.z=(E-U)/q,this.w=Math.acos((X+G+D-1)/2),this}setFromMatrixPosition(J){let Q=J.elements;return this.x=Q[12],this.y=Q[13],this.z=Q[14],this.w=Q[15],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this.w=Math.min(this.w,J.w),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this.w=Math.max(this.w,J.w),this}clamp(J,Q){return this.x=b0(this.x,J.x,Q.x),this.y=b0(this.y,J.y,Q.y),this.z=b0(this.z,J.z,Q.z),this.w=b0(this.w,J.w,Q.w),this}clampScalar(J,Q){return this.x=b0(this.x,J,Q),this.y=b0(this.y,J,Q),this.z=b0(this.z,J,Q),this.w=b0(this.w,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(b0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z+this.w*J.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this.z+=(J.z-this.z)*Q,this.w+=(J.w-this.w)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this.z=J.z+(Q.z-J.z)*$,this.w=J.w+(Q.w-J.w)*$,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z&&J.w===this.w}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this.z=J[Q+2],this.w=J[Q+3],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J[Q+2]=this.z,J[Q+3]=this.w,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this.z=J.getZ(Q),this.w=J.getW(Q),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class nQ extends D9{constructor(J=1,Q=1,$={}){super();$=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},$),this.isRenderTarget=!0,this.width=J,this.height=Q,this.depth=$.depth,this.scissor=new UJ(0,0,J,Q),this.scissorTest=!1,this.viewport=new UJ(0,0,J,Q),this.textures=[];let W={width:J,height:Q,depth:$.depth},K=new wJ(W),Z=$.count;for(let H=0;H<Z;H++)this.textures[H]=K.clone(),this.textures[H].isRenderTargetTexture=!0,this.textures[H].renderTarget=this;this._setTextureOptions($),this.depthBuffer=$.depthBuffer,this.stencilBuffer=$.stencilBuffer,this.resolveColorBuffer=$.resolveColorBuffer,this.resolveDepthBuffer=$.resolveDepthBuffer,this.resolveStencilBuffer=$.resolveStencilBuffer,this.storeMultisampledColorBuffer=$.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=$.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=$.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=$.depthTexture,this.samples=$.samples,this.multiview=$.multiview,this.useArrayDepthTexture=$.useArrayDepthTexture}_setTextureOptions(J={}){let Q={minFilter:1006,generateMipmaps:!1,flipY:!1,internalFormat:null};if(J.mapping!==void 0)Q.mapping=J.mapping;if(J.wrapS!==void 0)Q.wrapS=J.wrapS;if(J.wrapT!==void 0)Q.wrapT=J.wrapT;if(J.wrapR!==void 0)Q.wrapR=J.wrapR;if(J.magFilter!==void 0)Q.magFilter=J.magFilter;if(J.minFilter!==void 0)Q.minFilter=J.minFilter;if(J.format!==void 0)Q.format=J.format;if(J.type!==void 0)Q.type=J.type;if(J.anisotropy!==void 0)Q.anisotropy=J.anisotropy;if(J.colorSpace!==void 0)Q.colorSpace=J.colorSpace;if(J.flipY!==void 0)Q.flipY=J.flipY;if(J.generateMipmaps!==void 0)Q.generateMipmaps=J.generateMipmaps;if(J.internalFormat!==void 0)Q.internalFormat=J.internalFormat;for(let $=0;$<this.textures.length;$++)this.textures[$].setValues(Q)}get texture(){return this.textures[0]}set texture(J){this.textures[0]=J}set depthTexture(J){if(this._depthTexture!==null&&this._depthTexture.renderTarget===this)this._depthTexture.renderTarget=null;if(J!==null&&J.renderTarget===null)J.renderTarget=this;this._depthTexture=J}get depthTexture(){return this._depthTexture}setSize(J,Q,$=1){if(this.width!==J||this.height!==Q||this.depth!==$){this.width=J,this.height=Q,this.depth=$;for(let W=0,K=this.textures.length;W<K;W++)if(this.textures[W].image.width=J,this.textures[W].image.height=Q,this.textures[W].image.depth=$,this.textures[W].isData3DTexture!==!0)this.textures[W].isArrayTexture=this.textures[W].image.depth>1;this.dispose()}this.viewport.set(0,0,J,Q),this.scissor.set(0,0,J,Q)}clone(){return new this.constructor().copy(this)}copy(J){this.width=J.width,this.height=J.height,this.depth=J.depth,this.scissor.copy(J.scissor),this.scissorTest=J.scissorTest,this.viewport.copy(J.viewport),this.textures.length=0;for(let Q=0,$=J.textures.length;Q<$;Q++){this.textures[Q]=J.textures[Q].clone(),this.textures[Q].isRenderTargetTexture=!0,this.textures[Q].renderTarget=this;let W=Object.assign({},J.textures[Q].image);this.textures[Q].source=new X7(W)}if(this.depthBuffer=J.depthBuffer,this.stencilBuffer=J.stencilBuffer,this.resolveColorBuffer=J.resolveColorBuffer,this.resolveDepthBuffer=J.resolveDepthBuffer,this.resolveStencilBuffer=J.resolveStencilBuffer,this.storeMultisampledColorBuffer=J.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=J.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=J.storeMultisampledStencilBuffer,J.depthTexture!==null)if(J.depthTexture.renderTarget===J){let Q=J.depthTexture.clone();Q.renderTarget=null,this.depthTexture=Q}else this.depthTexture=J.depthTexture;return this.samples=J.samples,this.multiview=J.multiview,this.useArrayDepthTexture=J.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class cJ extends nQ{constructor(J=1,Q=1,$={}){super(J,Q,$);this.isWebGLRenderTarget=!0}}class J6 extends wJ{constructor(J=null,Q=1,$=1,W=1){super(null);this.isDataArrayTexture=!0,this.image={data:J,width:Q,height:$,depth:W},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(J){return super.copy(J),this.wrapR=J.wrapR,this}addLayerUpdate(J){this.layerUpdates.add(J)}clearLayerUpdates(){this.layerUpdates.clear()}}class sQ extends wJ{constructor(J=null,Q=1,$=1,W=1){super(null);this.isData3DTexture=!0,this.image={data:J,width:Q,height:$,depth:W},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(J){return super.copy(J),this.wrapR=J.wrapR,this}}class KJ{static{KJ.prototype.isMatrix4=!0}constructor(J,Q,$,W,K,Z,H,Y,X,U,N,E,G,F,L,I){if(this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],J!==void 0)this.set(J,Q,$,W,K,Z,H,Y,X,U,N,E,G,F,L,I)}set(J,Q,$,W,K,Z,H,Y,X,U,N,E,G,F,L,I){let D=this.elements;return D[0]=J,D[4]=Q,D[8]=$,D[12]=W,D[1]=K,D[5]=Z,D[9]=H,D[13]=Y,D[2]=X,D[6]=U,D[10]=N,D[14]=E,D[3]=G,D[7]=F,D[11]=L,D[15]=I,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new KJ().fromArray(this.elements)}copy(J){let Q=this.elements,$=J.elements;return Q[0]=$[0],Q[1]=$[1],Q[2]=$[2],Q[3]=$[3],Q[4]=$[4],Q[5]=$[5],Q[6]=$[6],Q[7]=$[7],Q[8]=$[8],Q[9]=$[9],Q[10]=$[10],Q[11]=$[11],Q[12]=$[12],Q[13]=$[13],Q[14]=$[14],Q[15]=$[15],this}copyPosition(J){let Q=this.elements,$=J.elements;return Q[12]=$[12],Q[13]=$[13],Q[14]=$[14],this}setFromMatrix3(J){let Q=J.elements;return this.set(Q[0],Q[3],Q[6],0,Q[1],Q[4],Q[7],0,Q[2],Q[5],Q[8],0,0,0,0,1),this}extractBasis(J,Q,$){if(this.determinantAffine()===0)return J.set(1,0,0),Q.set(0,1,0),$.set(0,0,1),this;return J.setFromMatrixColumn(this,0),Q.setFromMatrixColumn(this,1),$.setFromMatrixColumn(this,2),this}makeBasis(J,Q,$){return this.set(J.x,Q.x,$.x,0,J.y,Q.y,$.y,0,J.z,Q.z,$.z,0,0,0,0,1),this}extractRotation(J){if(J.determinantAffine()===0)return this.identity();let Q=this.elements,$=J.elements,W=1/O8.setFromMatrixColumn(J,0).length(),K=1/O8.setFromMatrixColumn(J,1).length(),Z=1/O8.setFromMatrixColumn(J,2).length();return Q[0]=$[0]*W,Q[1]=$[1]*W,Q[2]=$[2]*W,Q[3]=0,Q[4]=$[4]*K,Q[5]=$[5]*K,Q[6]=$[6]*K,Q[7]=0,Q[8]=$[8]*Z,Q[9]=$[9]*Z,Q[10]=$[10]*Z,Q[11]=0,Q[12]=0,Q[13]=0,Q[14]=0,Q[15]=1,this}makeRotationFromEuler(J){let Q=this.elements,$=J.x,W=J.y,K=J.z,Z=Math.cos($),H=Math.sin($),Y=Math.cos(W),X=Math.sin(W),U=Math.cos(K),N=Math.sin(K);if(J.order==="XYZ"){let E=Z*U,G=Z*N,F=H*U,L=H*N;Q[0]=Y*U,Q[4]=-Y*N,Q[8]=X,Q[1]=G+F*X,Q[5]=E-L*X,Q[9]=-H*Y,Q[2]=L-E*X,Q[6]=F+G*X,Q[10]=Z*Y}else if(J.order==="YXZ"){let E=Y*U,G=Y*N,F=X*U,L=X*N;Q[0]=E+L*H,Q[4]=F*H-G,Q[8]=Z*X,Q[1]=Z*N,Q[5]=Z*U,Q[9]=-H,Q[2]=G*H-F,Q[6]=L+E*H,Q[10]=Z*Y}else if(J.order==="ZXY"){let E=Y*U,G=Y*N,F=X*U,L=X*N;Q[0]=E-L*H,Q[4]=-Z*N,Q[8]=F+G*H,Q[1]=G+F*H,Q[5]=Z*U,Q[9]=L-E*H,Q[2]=-Z*X,Q[6]=H,Q[10]=Z*Y}else if(J.order==="ZYX"){let E=Z*U,G=Z*N,F=H*U,L=H*N;Q[0]=Y*U,Q[4]=F*X-G,Q[8]=E*X+L,Q[1]=Y*N,Q[5]=L*X+E,Q[9]=G*X-F,Q[2]=-X,Q[6]=H*Y,Q[10]=Z*Y}else if(J.order==="YZX"){let E=Z*Y,G=Z*X,F=H*Y,L=H*X;Q[0]=Y*U,Q[4]=L-E*N,Q[8]=F*N+G,Q[1]=N,Q[5]=Z*U,Q[9]=-H*U,Q[2]=-X*U,Q[6]=G*N+F,Q[10]=E-L*N}else if(J.order==="XZY"){let E=Z*Y,G=Z*X,F=H*Y,L=H*X;Q[0]=Y*U,Q[4]=-N,Q[8]=X*U,Q[1]=E*N+L,Q[5]=Z*U,Q[9]=G*N-F,Q[2]=F*N-G,Q[6]=H*U,Q[10]=L*N+E}return Q[3]=0,Q[7]=0,Q[11]=0,Q[12]=0,Q[13]=0,Q[14]=0,Q[15]=1,this}makeRotationFromQuaternion(J){return this.compose(ZH,J,HH)}lookAt(J,Q,$){let W=this.elements;if(lJ.subVectors(J,Q),lJ.lengthSq()===0)lJ.z=1;if(lJ.normalize(),j9.crossVectors($,lJ),j9.lengthSq()===0){if(Math.abs($.z)===1)lJ.x+=0.0001;else lJ.z+=0.0001;lJ.normalize(),j9.crossVectors($,lJ)}return j9.normalize(),I7.crossVectors(lJ,j9),W[0]=j9.x,W[4]=I7.x,W[8]=lJ.x,W[1]=j9.y,W[5]=I7.y,W[9]=lJ.y,W[2]=j9.z,W[6]=I7.z,W[10]=lJ.z,this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,Q){let $=J.elements,W=Q.elements,K=this.elements,Z=$[0],H=$[4],Y=$[8],X=$[12],U=$[1],N=$[5],E=$[9],G=$[13],F=$[2],L=$[6],I=$[10],D=$[14],q=$[3],A=$[7],y=$[11],V=$[15],z=W[0],C=W[4],P=W[8],M=W[12],B=W[1],l=W[5],h=W[9],v=W[13],r=W[2],S=W[6],d=W[10],o=W[14],m=W[3],Q0=W[7],c=W[11],a=W[15];return K[0]=Z*z+H*B+Y*r+X*m,K[4]=Z*C+H*l+Y*S+X*Q0,K[8]=Z*P+H*h+Y*d+X*c,K[12]=Z*M+H*v+Y*o+X*a,K[1]=U*z+N*B+E*r+G*m,K[5]=U*C+N*l+E*S+G*Q0,K[9]=U*P+N*h+E*d+G*c,K[13]=U*M+N*v+E*o+G*a,K[2]=F*z+L*B+I*r+D*m,K[6]=F*C+L*l+I*S+D*Q0,K[10]=F*P+L*h+I*d+D*c,K[14]=F*M+L*v+I*o+D*a,K[3]=q*z+A*B+y*r+V*m,K[7]=q*C+A*l+y*S+V*Q0,K[11]=q*P+A*h+y*d+V*c,K[15]=q*M+A*v+y*o+V*a,this}multiplyScalar(J){let Q=this.elements;return Q[0]*=J,Q[4]*=J,Q[8]*=J,Q[12]*=J,Q[1]*=J,Q[5]*=J,Q[9]*=J,Q[13]*=J,Q[2]*=J,Q[6]*=J,Q[10]*=J,Q[14]*=J,Q[3]*=J,Q[7]*=J,Q[11]*=J,Q[15]*=J,this}determinant(){let J=this.elements,Q=J[0],$=J[4],W=J[8],K=J[12],Z=J[1],H=J[5],Y=J[9],X=J[13],U=J[2],N=J[6],E=J[10],G=J[14],F=J[3],L=J[7],I=J[11],D=J[15],q=Y*G-X*E,A=H*G-X*N,y=H*E-Y*N,V=Z*G-X*U,z=Z*E-Y*U,C=Z*N-H*U;return Q*(L*q-I*A+D*y)-$*(F*q-I*V+D*z)+W*(F*A-L*V+D*C)-K*(F*y-L*z+I*C)}determinantAffine(){let J=this.elements,Q=J[0],$=J[4],W=J[8],K=J[1],Z=J[5],H=J[9],Y=J[2],X=J[6],U=J[10];return Q*(Z*U-H*X)-$*(K*U-H*Y)+W*(K*X-Z*Y)}transpose(){let J=this.elements,Q;return Q=J[1],J[1]=J[4],J[4]=Q,Q=J[2],J[2]=J[8],J[8]=Q,Q=J[6],J[6]=J[9],J[9]=Q,Q=J[3],J[3]=J[12],J[12]=Q,Q=J[7],J[7]=J[13],J[13]=Q,Q=J[11],J[11]=J[14],J[14]=Q,this}setPosition(J,Q,$){let W=this.elements;if(J.isVector3)W[12]=J.x,W[13]=J.y,W[14]=J.z;else W[12]=J,W[13]=Q,W[14]=$;return this}invert(){let J=this.elements,Q=J[0],$=J[1],W=J[2],K=J[3],Z=J[4],H=J[5],Y=J[6],X=J[7],U=J[8],N=J[9],E=J[10],G=J[11],F=J[12],L=J[13],I=J[14],D=J[15],q=Q*H-$*Z,A=Q*Y-W*Z,y=Q*X-K*Z,V=$*Y-W*H,z=$*X-K*H,C=W*X-K*Y,P=U*L-N*F,M=U*I-E*F,B=U*D-G*F,l=N*I-E*L,h=N*D-G*L,v=E*D-G*I,r=q*v-A*h+y*l+V*B-z*M+C*P;if(r===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let S=1/r;return J[0]=(H*v-Y*h+X*l)*S,J[1]=(W*h-$*v-K*l)*S,J[2]=(L*C-I*z+D*V)*S,J[3]=(E*z-N*C-G*V)*S,J[4]=(Y*B-Z*v-X*M)*S,J[5]=(Q*v-W*B+K*M)*S,J[6]=(I*y-F*C-D*A)*S,J[7]=(U*C-E*y+G*A)*S,J[8]=(Z*h-H*B+X*P)*S,J[9]=($*B-Q*h-K*P)*S,J[10]=(F*z-L*y+D*q)*S,J[11]=(N*y-U*z-G*q)*S,J[12]=(H*M-Z*l-Y*P)*S,J[13]=(Q*l-$*M+W*P)*S,J[14]=(L*A-F*V-I*q)*S,J[15]=(U*V-N*A+E*q)*S,this}scale(J){let Q=this.elements,$=J.x,W=J.y,K=J.z;return Q[0]*=$,Q[4]*=W,Q[8]*=K,Q[1]*=$,Q[5]*=W,Q[9]*=K,Q[2]*=$,Q[6]*=W,Q[10]*=K,Q[3]*=$,Q[7]*=W,Q[11]*=K,this}getMaxScaleOnAxis(){let J=this.elements,Q=J[0]*J[0]+J[1]*J[1]+J[2]*J[2],$=J[4]*J[4]+J[5]*J[5]+J[6]*J[6],W=J[8]*J[8]+J[9]*J[9]+J[10]*J[10];return Math.sqrt(Math.max(Q,$,W))}makeTranslation(J,Q,$){if(J.isVector3)this.set(1,0,0,J.x,0,1,0,J.y,0,0,1,J.z,0,0,0,1);else this.set(1,0,0,J,0,1,0,Q,0,0,1,$,0,0,0,1);return this}makeRotationX(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(1,0,0,0,0,Q,-$,0,0,$,Q,0,0,0,0,1),this}makeRotationY(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,0,$,0,0,1,0,0,-$,0,Q,0,0,0,0,1),this}makeRotationZ(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,-$,0,0,$,Q,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(J,Q){let $=Math.cos(Q),W=Math.sin(Q),K=1-$,Z=J.x,H=J.y,Y=J.z,X=K*Z,U=K*H;return this.set(X*Z+$,X*H-W*Y,X*Y+W*H,0,X*H+W*Y,U*H+$,U*Y-W*Z,0,X*Y-W*H,U*Y+W*Z,K*Y*Y+$,0,0,0,0,1),this}makeScale(J,Q,$){return this.set(J,0,0,0,0,Q,0,0,0,0,$,0,0,0,0,1),this}makeShear(J,Q,$,W,K,Z){return this.set(1,$,K,0,J,1,Z,0,Q,W,1,0,0,0,0,1),this}compose(J,Q,$){let W=this.elements,K=Q._x,Z=Q._y,H=Q._z,Y=Q._w,X=K+K,U=Z+Z,N=H+H,E=K*X,G=K*U,F=K*N,L=Z*U,I=Z*N,D=H*N,q=Y*X,A=Y*U,y=Y*N,V=$.x,z=$.y,C=$.z;return W[0]=(1-(L+D))*V,W[1]=(G+y)*V,W[2]=(F-A)*V,W[3]=0,W[4]=(G-y)*z,W[5]=(1-(E+D))*z,W[6]=(I+q)*z,W[7]=0,W[8]=(F+A)*C,W[9]=(I-q)*C,W[10]=(1-(E+L))*C,W[11]=0,W[12]=J.x,W[13]=J.y,W[14]=J.z,W[15]=1,this}decompose(J,Q,$){let W=this.elements;J.x=W[12],J.y=W[13],J.z=W[14];let K=this.determinantAffine();if(K===0)return $.set(1,1,1),Q.identity(),this;let Z=O8.set(W[0],W[1],W[2]).length(),H=O8.set(W[4],W[5],W[6]).length(),Y=O8.set(W[8],W[9],W[10]).length();if(K<0)Z=-Z;J9.copy(this);let X=1/Z,U=1/H,N=1/Y;return J9.elements[0]*=X,J9.elements[1]*=X,J9.elements[2]*=X,J9.elements[4]*=U,J9.elements[5]*=U,J9.elements[6]*=U,J9.elements[8]*=N,J9.elements[9]*=N,J9.elements[10]*=N,Q.setFromRotationMatrix(J9),$.x=Z,$.y=H,$.z=Y,this}makePerspective(J,Q,$,W,K,Z,H=2000,Y=!1){let X=this.elements,U=2*K/(Q-J),N=2*K/($-W),E=(Q+J)/(Q-J),G=($+W)/($-W),F,L;if(Y)F=K/(Z-K),L=Z*K/(Z-K);else if(H===2000)F=-(Z+K)/(Z-K),L=-2*Z*K/(Z-K);else if(H===2001)F=-Z/(Z-K),L=-Z*K/(Z-K);else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+H);return X[0]=U,X[4]=0,X[8]=E,X[12]=0,X[1]=0,X[5]=N,X[9]=G,X[13]=0,X[2]=0,X[6]=0,X[10]=F,X[14]=L,X[3]=0,X[7]=0,X[11]=-1,X[15]=0,this}makeOrthographic(J,Q,$,W,K,Z,H=2000,Y=!1){let X=this.elements,U=2/(Q-J),N=2/($-W),E=-(Q+J)/(Q-J),G=-($+W)/($-W),F,L;if(Y)F=1/(Z-K),L=Z/(Z-K);else if(H===2000)F=-2/(Z-K),L=-(Z+K)/(Z-K);else if(H===2001)F=-1/(Z-K),L=-K/(Z-K);else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+H);return X[0]=U,X[4]=0,X[8]=0,X[12]=E,X[1]=0,X[5]=N,X[9]=0,X[13]=G,X[2]=0,X[6]=0,X[10]=F,X[14]=L,X[3]=0,X[7]=0,X[11]=0,X[15]=1,this}equals(J){let Q=this.elements,$=J.elements;for(let W=0;W<16;W++)if(Q[W]!==$[W])return!1;return!0}fromArray(J,Q=0){for(let $=0;$<16;$++)this.elements[$]=J[$+Q];return this}toArray(J=[],Q=0){let $=this.elements;return J[Q]=$[0],J[Q+1]=$[1],J[Q+2]=$[2],J[Q+3]=$[3],J[Q+4]=$[4],J[Q+5]=$[5],J[Q+6]=$[6],J[Q+7]=$[7],J[Q+8]=$[8],J[Q+9]=$[9],J[Q+10]=$[10],J[Q+11]=$[11],J[Q+12]=$[12],J[Q+13]=$[13],J[Q+14]=$[14],J[Q+15]=$[15],J}}var O8=new f,J9=new KJ,ZH=new f(0,0,0),HH=new f(1,1,1),j9=new f,I7=new f,lJ=new f,QW=new KJ,$W=new rJ;class b9{constructor(J=0,Q=0,$=0,W=b9.DEFAULT_ORDER){this.isEuler=!0,this._x=J,this._y=Q,this._z=$,this._order=W}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get order(){return this._order}set order(J){this._order=J,this._onChangeCallback()}set(J,Q,$,W=this._order){return this._x=J,this._y=Q,this._z=$,this._order=W,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(J){return this._x=J._x,this._y=J._y,this._z=J._z,this._order=J._order,this._onChangeCallback(),this}setFromRotationMatrix(J,Q=this._order,$=!0){let W=J.elements,K=W[0],Z=W[4],H=W[8],Y=W[1],X=W[5],U=W[9],N=W[2],E=W[6],G=W[10];switch(Q){case"XYZ":if(this._y=Math.asin(b0(H,-1,1)),Math.abs(H)<0.9999999)this._x=Math.atan2(-U,G),this._z=Math.atan2(-Z,K);else this._x=Math.atan2(E,X),this._z=0;break;case"YXZ":if(this._x=Math.asin(-b0(U,-1,1)),Math.abs(U)<0.9999999)this._y=Math.atan2(H,G),this._z=Math.atan2(Y,X);else this._y=Math.atan2(-N,K),this._z=0;break;case"ZXY":if(this._x=Math.asin(b0(E,-1,1)),Math.abs(E)<0.9999999)this._y=Math.atan2(-N,G),this._z=Math.atan2(-Z,X);else this._y=0,this._z=Math.atan2(Y,K);break;case"ZYX":if(this._y=Math.asin(-b0(N,-1,1)),Math.abs(N)<0.9999999)this._x=Math.atan2(E,G),this._z=Math.atan2(Y,K);else this._x=0,this._z=Math.atan2(-Z,X);break;case"YZX":if(this._z=Math.asin(b0(Y,-1,1)),Math.abs(Y)<0.9999999)this._x=Math.atan2(-U,X),this._y=Math.atan2(-N,K);else this._x=0,this._y=Math.atan2(H,G);break;case"XZY":if(this._z=Math.asin(-b0(Z,-1,1)),Math.abs(Z)<0.9999999)this._x=Math.atan2(E,X),this._y=Math.atan2(H,K);else this._x=Math.atan2(-U,G),this._y=0;break;default:P0("Euler: .setFromRotationMatrix() encountered an unknown order: "+Q)}if(this._order=Q,$===!0)this._onChangeCallback();return this}setFromQuaternion(J,Q,$){return QW.makeRotationFromQuaternion(J),this.setFromRotationMatrix(QW,Q,$)}setFromVector3(J,Q=this._order){return this.set(J.x,J.y,J.z,Q)}reorder(J){return $W.setFromEuler(this),this.setFromQuaternion($W,J)}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._order===this._order}fromArray(J){if(this._x=J[0],this._y=J[1],this._z=J[2],J[3]!==void 0)this._order=J[3];return this._onChangeCallback(),this}toArray(J=[],Q=0){return J[Q]=this._x,J[Q+1]=this._y,J[Q+2]=this._z,J[Q+3]=this._order,J}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}b9.DEFAULT_ORDER="XYZ";class U7{constructor(){this.mask=1}set(J){this.mask=(1<<J|0)>>>0}enable(J){this.mask|=1<<J|0}enableAll(){this.mask=-1}toggle(J){this.mask^=1<<J|0}disable(J){this.mask&=~(1<<J|0)}disableAll(){this.mask=0}test(J){return(this.mask&J.mask)!==0}isEnabled(J){return(this.mask&(1<<J|0))!==0}}var YH=0,WW=new f,R8=new rJ,k9=new KJ,z7=new f,a8=new f,XH=new f,UH=new rJ,KW=new f(1,0,0),ZW=new f(0,1,0),HW=new f(0,0,1),YW={type:"added"},GH={type:"removed"},M8={type:"childadded",child:null},C6={type:"childremoved",child:null};class _J extends D9{constructor(){super();this.isObject3D=!0,Object.defineProperty(this,"id",{value:YH++}),this.uuid=x8(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=_J.DEFAULT_UP.clone();let J=new f,Q=new b9,$=new rJ,W=new f(1,1,1);function K(){$.setFromEuler(Q,!1)}function Z(){Q.setFromQuaternion($,void 0,!1)}Q._onChange(K),$._onChange(Z),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:J},rotation:{configurable:!0,enumerable:!0,value:Q},quaternion:{configurable:!0,enumerable:!0,value:$},scale:{configurable:!0,enumerable:!0,value:W},modelViewMatrix:{value:new KJ},normalMatrix:{value:new j0}}),this.matrix=new KJ,this.matrixWorld=new KJ,this.matrixAutoUpdate=_J.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=_J.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new U7,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(J){if(this.matrixAutoUpdate)this.updateMatrix();this.matrix.premultiply(J),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(J){return this.quaternion.premultiply(J),this}setRotationFromAxisAngle(J,Q){this.quaternion.setFromAxisAngle(J,Q)}setRotationFromEuler(J){this.quaternion.setFromEuler(J,!0)}setRotationFromMatrix(J){this.quaternion.setFromRotationMatrix(J)}setRotationFromQuaternion(J){this.quaternion.copy(J)}rotateOnAxis(J,Q){return R8.setFromAxisAngle(J,Q),this.quaternion.multiply(R8),this}rotateOnWorldAxis(J,Q){return R8.setFromAxisAngle(J,Q),this.quaternion.premultiply(R8),this}rotateX(J){return this.rotateOnAxis(KW,J)}rotateY(J){return this.rotateOnAxis(ZW,J)}rotateZ(J){return this.rotateOnAxis(HW,J)}translateOnAxis(J,Q){return WW.copy(J).applyQuaternion(this.quaternion),this.position.add(WW.multiplyScalar(Q)),this}translateX(J){return this.translateOnAxis(KW,J)}translateY(J){return this.translateOnAxis(ZW,J)}translateZ(J){return this.translateOnAxis(HW,J)}localToWorld(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(this.matrixWorld)}worldToLocal(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(k9.copy(this.matrixWorld).invert())}lookAt(J,Q,$){if(J.isVector3)z7.copy(J);else z7.set(J,Q,$);let W=this.parent;if(this.updateWorldMatrix(!0,!1),a8.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight)k9.lookAt(a8,z7,this.up);else k9.lookAt(z7,a8,this.up);if(this.quaternion.setFromRotationMatrix(k9),W)k9.extractRotation(W.matrixWorld),R8.setFromRotationMatrix(k9),this.quaternion.premultiply(R8.invert())}add(J){if(arguments.length>1){for(let Q=0;Q<arguments.length;Q++)this.add(arguments[Q]);return this}if(J===this)return T0("Object3D.add: object can't be added as a child of itself.",J),this;if(J&&J.isObject3D)J.removeFromParent(),J.parent=this,this.children.push(J),J.dispatchEvent(YW),M8.child=J,this.dispatchEvent(M8),M8.child=null;else T0("Object3D.add: object not an instance of THREE.Object3D.",J);return this}remove(J){if(arguments.length>1){for(let $=0;$<arguments.length;$++)this.remove(arguments[$]);return this}let Q=this.children.indexOf(J);if(Q!==-1)J.parent=null,this.children.splice(Q,1),J.dispatchEvent(GH),C6.child=J,this.dispatchEvent(C6),C6.child=null;return this}removeFromParent(){let J=this.parent;if(J!==null)J.remove(this);return this}clear(){return this.remove(...this.children)}attach(J){if(this.updateWorldMatrix(!0,!1),k9.copy(this.matrixWorld).invert(),J.parent!==null)J.parent.updateWorldMatrix(!0,!1),k9.multiply(J.parent.matrixWorld);return J.applyMatrix4(k9),J.removeFromParent(),J.parent=this,this.children.push(J),J.updateWorldMatrix(!1,!0),J.dispatchEvent(YW),M8.child=J,this.dispatchEvent(M8),M8.child=null,this}getObjectById(J){return this.getObjectByProperty("id",J)}getObjectByName(J){return this.getObjectByProperty("name",J)}getObjectByProperty(J,Q){if(this[J]===Q)return this;for(let $=0,W=this.children.length;$<W;$++){let Z=this.children[$].getObjectByProperty(J,Q);if(Z!==void 0)return Z}return}getObjectsByProperty(J,Q,$=[]){if(this[J]===Q)$.push(this);let W=this.children;for(let K=0,Z=W.length;K<Z;K++)W[K].getObjectsByProperty(J,Q,$);return $}getWorldPosition(J){return this.updateWorldMatrix(!0,!1),J.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(a8,J,XH),J}getWorldScale(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(a8,UH,J),J}getWorldDirection(J){this.updateWorldMatrix(!0,!1);let Q=this.matrixWorld.elements;return J.set(Q[8],Q[9],Q[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(J){J(this);let Q=this.children;for(let $=0,W=Q.length;$<W;$++)Q[$].traverse(J)}traverseVisible(J){if(this.visible===!1)return;J(this);let Q=this.children;for(let $=0,W=Q.length;$<W;$++)Q[$].traverseVisible(J)}traverseAncestors(J){let Q=this.parent;if(Q!==null)J(Q),Q.traverseAncestors(J)}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let J=this.pivot;if(J!==null){let{x:Q,y:$,z:W}=J,K=this.matrix.elements;K[12]+=Q-K[0]*Q-K[4]*$-K[8]*W,K[13]+=$-K[1]*Q-K[5]*$-K[9]*W,K[14]+=W-K[2]*Q-K[6]*$-K[10]*W}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(J){if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||J){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,J=!0}let Q=this.children;for(let $=0,W=Q.length;$<W;$++)Q[$].updateMatrixWorld(J)}updateWorldMatrix(J,Q,$=!1){let W=this.parent;if(J===!0&&W!==null)W.updateWorldMatrix(!0,!1);if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||$){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,$=!0}if(Q===!0){let K=this.children;for(let Z=0,H=K.length;Z<H;Z++)K[Z].updateWorldMatrix(!1,!0,$)}}toJSON(J){let Q=J===void 0||typeof J==="string",$={};if(Q)J={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},$.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"};let W={};if(W.uuid=this.uuid,W.type=this.type,W.name=this.name,W.castShadow=this.castShadow,W.receiveShadow=this.receiveShadow,W.visible=this.visible,W.frustumCulled=this.frustumCulled,W.renderOrder=this.renderOrder,W.static=this.static,W.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0)W.userData=this.userData;if(W.layers=this.layers.mask,W.matrix=this.matrix.toArray(),W.up=this.up.toArray(),this.pivot!==null)W.pivot=this.pivot.toArray();if(this.morphTargetDictionary!==void 0)W.morphTargetDictionary=Object.assign({},this.morphTargetDictionary);if(this.morphTargetInfluences!==void 0)W.morphTargetInfluences=this.morphTargetInfluences.slice();if(this.isInstancedMesh){if(W.type="InstancedMesh",W.count=this.count,W.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null)W.instanceColor=this.instanceColor.toJSON()}if(this.isBatchedMesh){if(W.type="BatchedMesh",W.perObjectFrustumCulled=this.perObjectFrustumCulled,W.sortObjects=this.sortObjects,W.drawRanges=this._drawRanges,W.reservedRanges=this._reservedRanges,W.geometryInfo=this._geometryInfo.map((H)=>({...H,boundingBox:H.boundingBox?H.boundingBox.toJSON():void 0,boundingSphere:H.boundingSphere?H.boundingSphere.toJSON():void 0})),W.instanceInfo=this._instanceInfo.map((H)=>({...H})),W.availableInstanceIds=this._availableInstanceIds.slice(),W.availableGeometryIds=this._availableGeometryIds.slice(),W.nextIndexStart=this._nextIndexStart,W.nextVertexStart=this._nextVertexStart,W.geometryCount=this._geometryCount,W.maxInstanceCount=this._maxInstanceCount,W.maxVertexCount=this._maxVertexCount,W.maxIndexCount=this._maxIndexCount,W.geometryInitialized=this._geometryInitialized,W.matricesTexture=this._matricesTexture.toJSON(J),W.indirectTexture=this._indirectTexture.toJSON(J),this._colorsTexture!==null)W.colorsTexture=this._colorsTexture.toJSON(J);if(this.boundingSphere!==null)W.boundingSphere=this.boundingSphere.toJSON();if(this.boundingBox!==null)W.boundingBox=this.boundingBox.toJSON()}function K(H,Y){if(H[Y.uuid]===void 0)H[Y.uuid]=Y.toJSON(J);return Y.uuid}if(this.isScene){if(this.background){if(this.background.isColor)W.background=this.background.toJSON();else if(this.background.isTexture)W.background=this.background.toJSON(J).uuid}if(this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0)W.environment=this.environment.toJSON(J).uuid}else if(this.isMesh||this.isLine||this.isPoints){W.geometry=K(J.geometries,this.geometry);let H=this.geometry.parameters;if(H!==void 0&&H.shapes!==void 0){let Y=H.shapes;if(Array.isArray(Y))for(let X=0,U=Y.length;X<U;X++){let N=Y[X];K(J.shapes,N)}else K(J.shapes,Y)}}if(this.isSkinnedMesh){if(W.bindMode=this.bindMode,W.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0)K(J.skeletons,this.skeleton),W.skeleton=this.skeleton.uuid}if(this.material!==void 0)if(Array.isArray(this.material)){let H=[];for(let Y=0,X=this.material.length;Y<X;Y++)H.push(K(J.materials,this.material[Y]));W.material=H}else W.material=K(J.materials,this.material);if(this.children.length>0){W.children=[];for(let H=0;H<this.children.length;H++)W.children.push(this.children[H].toJSON(J).object)}if(this.animations.length>0){W.animations=[];for(let H=0;H<this.animations.length;H++){let Y=this.animations[H];W.animations.push(K(J.animations,Y))}}if(Q){let H=Z(J.geometries),Y=Z(J.materials),X=Z(J.textures),U=Z(J.images),N=Z(J.shapes),E=Z(J.skeletons),G=Z(J.animations),F=Z(J.nodes);if(H.length>0)$.geometries=H;if(Y.length>0)$.materials=Y;if(X.length>0)$.textures=X;if(U.length>0)$.images=U;if(N.length>0)$.shapes=N;if(E.length>0)$.skeletons=E;if(G.length>0)$.animations=G;if(F.length>0)$.nodes=F}return $.object=W,$;function Z(H){let Y=[];for(let X in H){let U=H[X];delete U.metadata,Y.push(U)}return Y}}clone(J){return new this.constructor().copy(this,J)}copy(J,Q=!0){if(this.name=J.name,this.up.copy(J.up),this.position.copy(J.position),this.rotation.order=J.rotation.order,this.quaternion.copy(J.quaternion),this.scale.copy(J.scale),this.pivot=J.pivot!==null?J.pivot.clone():null,this.matrix.copy(J.matrix),this.matrixWorld.copy(J.matrixWorld),this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrixWorldAutoUpdate=J.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=J.matrixWorldNeedsUpdate,this.layers.mask=J.layers.mask,this.visible=J.visible,this.castShadow=J.castShadow,this.receiveShadow=J.receiveShadow,this.frustumCulled=J.frustumCulled,this.renderOrder=J.renderOrder,this.static=J.static,this.animations=J.animations.slice(),this.userData=JSON.parse(JSON.stringify(J.userData)),Q===!0)for(let $=0;$<J.children.length;$++){let W=J.children[$];this.add(W.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}_J.DEFAULT_UP=new f(0,1,0);_J.DEFAULT_MATRIX_AUTO_UPDATE=!0;_J.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class _8 extends _J{constructor(){super();this.isGroup=!0,this.type="Group"}}var NH={type:"move"};class G7{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){if(this._hand===null)this._hand=new _8,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1};return this._hand}getTargetRaySpace(){if(this._targetRay===null)this._targetRay=new _8,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new f,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new f;return this._targetRay}getGripSpace(){if(this._grip===null)this._grip=new _8,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new f,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new f,this._grip.eventsEnabled=!1;return this._grip}dispatchEvent(J){if(this._targetRay!==null)this._targetRay.dispatchEvent(J);if(this._grip!==null)this._grip.dispatchEvent(J);if(this._hand!==null)this._hand.dispatchEvent(J);return this}connect(J){if(J&&J.hand){let Q=this._hand;if(Q)for(let $ of J.hand.values())this._getHandJoint(Q,$)}return this.dispatchEvent({type:"connected",data:J}),this}disconnect(J){if(this.dispatchEvent({type:"disconnected",data:J}),this._targetRay!==null)this._targetRay.visible=!1;if(this._grip!==null)this._grip.visible=!1;if(this._hand!==null)this._hand.visible=!1;return this}update(J,Q,$){let W=null,K=null,Z=null,H=this._targetRay,Y=this._grip,X=this._hand;if(J&&Q.session.visibilityState!=="visible-blurred"){if(X&&J.hand){Z=!0;for(let L of J.hand.values()){let I=Q.getJointPose(L,$),D=this._getHandJoint(X,L);if(I!==null)D.matrix.fromArray(I.transform.matrix),D.matrix.decompose(D.position,D.rotation,D.scale),D.matrixWorldNeedsUpdate=!0,D.jointRadius=I.radius;D.visible=I!==null}let U=X.joints["index-finger-tip"],N=X.joints["thumb-tip"],E=U.position.distanceTo(N.position),G=0.02,F=0.005;if(X.inputState.pinching&&E>G+F)X.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:J.handedness,target:this});else if(!X.inputState.pinching&&E<=G-F)X.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:J.handedness,target:this})}else if(Y!==null&&J.gripSpace){if(K=Q.getPose(J.gripSpace,$),K!==null){if(Y.matrix.fromArray(K.transform.matrix),Y.matrix.decompose(Y.position,Y.rotation,Y.scale),Y.matrixWorldNeedsUpdate=!0,K.linearVelocity)Y.hasLinearVelocity=!0,Y.linearVelocity.copy(K.linearVelocity);else Y.hasLinearVelocity=!1;if(K.angularVelocity)Y.hasAngularVelocity=!0,Y.angularVelocity.copy(K.angularVelocity);else Y.hasAngularVelocity=!1;if(Y.eventsEnabled)Y.dispatchEvent({type:"gripUpdated",data:J,target:this})}}if(H!==null){if(W=Q.getPose(J.targetRaySpace,$),W===null&&K!==null)W=K;if(W!==null){if(H.matrix.fromArray(W.transform.matrix),H.matrix.decompose(H.position,H.rotation,H.scale),H.matrixWorldNeedsUpdate=!0,W.linearVelocity)H.hasLinearVelocity=!0,H.linearVelocity.copy(W.linearVelocity);else H.hasLinearVelocity=!1;if(W.angularVelocity)H.hasAngularVelocity=!0,H.angularVelocity.copy(W.angularVelocity);else H.hasAngularVelocity=!1;this.dispatchEvent(NH)}}}if(H!==null)H.visible=W!==null;if(Y!==null)Y.visible=K!==null;if(X!==null)X.visible=Z!==null;return this}_getHandJoint(J,Q){if(J.joints[Q.jointName]===void 0){let $=new _8;$.matrixAutoUpdate=!1,$.visible=!1,J.joints[Q.jointName]=$,J.add($)}return J.joints[Q.jointName]}}var kK={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},y9={h:0,s:0,l:0},A7={h:0,s:0,l:0};function P6(J,Q,$){if($<0)$+=1;if($>1)$-=1;if($<0.16666666666666666)return J+(Q-J)*6*$;if($<0.5)return Q;if($<0.6666666666666666)return J+(Q-J)*6*(0.6666666666666666-$);return J}class g0{constructor(J,Q,$){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(J,Q,$)}set(J,Q,$){if(Q===void 0&&$===void 0){let W=J;if(W&&W.isColor)this.copy(W);else if(typeof W==="number")this.setHex(W);else if(typeof W==="string")this.setStyle(W)}else this.setRGB(J,Q,$);return this}setScalar(J){return this.r=J,this.g=J,this.b=J,this}setHex(J,Q="srgb"){return J=Math.floor(J),this.r=(J>>16&255)/255,this.g=(J>>8&255)/255,this.b=(J&255)/255,m0.colorSpaceToWorking(this,Q),this}setRGB(J,Q,$,W=m0.workingColorSpace){return this.r=J,this.g=Q,this.b=$,m0.colorSpaceToWorking(this,W),this}setHSL(J,Q,$,W=m0.workingColorSpace){if(J=dQ(J,1),Q=b0(Q,0,1),$=b0($,0,1),Q===0)this.r=this.g=this.b=$;else{let K=$<=0.5?$*(1+Q):$+Q-$*Q,Z=2*$-K;this.r=P6(Z,K,J+0.3333333333333333),this.g=P6(Z,K,J),this.b=P6(Z,K,J-0.3333333333333333)}return m0.colorSpaceToWorking(this,W),this}setStyle(J,Q="srgb"){function $(K){if(K===void 0)return;if(parseFloat(K)<1)P0("Color: Alpha component of "+J+" will be ignored.")}let W;if(W=/^(\w+)\(([^\)]*)\)/.exec(J)){let K,Z=W[1],H=W[2];switch(Z){case"rgb":case"rgba":if(K=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(H))return $(K[4]),this.setRGB(Math.min(255,parseInt(K[1],10))/255,Math.min(255,parseInt(K[2],10))/255,Math.min(255,parseInt(K[3],10))/255,Q);if(K=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(H))return $(K[4]),this.setRGB(Math.min(100,parseInt(K[1],10))/100,Math.min(100,parseInt(K[2],10))/100,Math.min(100,parseInt(K[3],10))/100,Q);break;case"hsl":case"hsla":if(K=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(H))return $(K[4]),this.setHSL(parseFloat(K[1])/360,parseFloat(K[2])/100,parseFloat(K[3])/100,Q);break;default:P0("Color: Unknown color model "+J)}}else if(W=/^\#([A-Fa-f\d]+)$/.exec(J)){let K=W[1],Z=K.length;if(Z===3)return this.setRGB(parseInt(K.charAt(0),16)/15,parseInt(K.charAt(1),16)/15,parseInt(K.charAt(2),16)/15,Q);else if(Z===6)return this.setHex(parseInt(K,16),Q);else P0("Color: Invalid hex color "+J)}else if(J&&J.length>0)return this.setColorName(J,Q);return this}setColorName(J,Q="srgb"){let $=kK[J.toLowerCase()];if($!==void 0)this.setHex($,Q);else P0("Color: Unknown color "+J);return this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(J){return this.r=J.r,this.g=J.g,this.b=J.b,this}copySRGBToLinear(J){return this.r=A9(J.r),this.g=A9(J.g),this.b=A9(J.b),this}copyLinearToSRGB(J){return this.r=T8(J.r),this.g=T8(J.g),this.b=T8(J.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(J="srgb"){return m0.workingToColorSpace(PJ.copy(this),J),Math.round(b0(PJ.r*255,0,255))*65536+Math.round(b0(PJ.g*255,0,255))*256+Math.round(b0(PJ.b*255,0,255))}getHexString(J="srgb"){return("000000"+this.getHex(J).toString(16)).slice(-6)}getHSL(J,Q=m0.workingColorSpace){m0.workingToColorSpace(PJ.copy(this),Q);let{r:$,g:W,b:K}=PJ,Z=Math.max($,W,K),H=Math.min($,W,K),Y,X,U=(H+Z)/2;if(H===Z)Y=0,X=0;else{let N=Z-H;switch(X=U<=0.5?N/(Z+H):N/(2-Z-H),Z){case $:Y=(W-K)/N+(W<K?6:0);break;case W:Y=(K-$)/N+2;break;case K:Y=($-W)/N+4;break}Y/=6}return J.h=Y,J.s=X,J.l=U,J}getRGB(J,Q=m0.workingColorSpace){return m0.workingToColorSpace(PJ.copy(this),Q),J.r=PJ.r,J.g=PJ.g,J.b=PJ.b,J}getStyle(J="srgb"){m0.workingToColorSpace(PJ.copy(this),J);let{r:Q,g:$,b:W}=PJ;if(J!=="srgb")return`color(${J} ${Q.toFixed(3)} ${$.toFixed(3)} ${W.toFixed(3)})`;return`rgb(${Math.round(Q*255)},${Math.round($*255)},${Math.round(W*255)})`}offsetHSL(J,Q,$){return this.getHSL(y9),this.setHSL(y9.h+J,y9.s+Q,y9.l+$)}add(J){return this.r+=J.r,this.g+=J.g,this.b+=J.b,this}addColors(J,Q){return this.r=J.r+Q.r,this.g=J.g+Q.g,this.b=J.b+Q.b,this}addScalar(J){return this.r+=J,this.g+=J,this.b+=J,this}sub(J){return this.r=Math.max(0,this.r-J.r),this.g=Math.max(0,this.g-J.g),this.b=Math.max(0,this.b-J.b),this}multiply(J){return this.r*=J.r,this.g*=J.g,this.b*=J.b,this}multiplyScalar(J){return this.r*=J,this.g*=J,this.b*=J,this}lerp(J,Q){return this.r+=(J.r-this.r)*Q,this.g+=(J.g-this.g)*Q,this.b+=(J.b-this.b)*Q,this}lerpColors(J,Q,$){return this.r=J.r+(Q.r-J.r)*$,this.g=J.g+(Q.g-J.g)*$,this.b=J.b+(Q.b-J.b)*$,this}lerpHSL(J,Q){this.getHSL(y9),J.getHSL(A7);let $=Q7(y9.h,A7.h,Q),W=Q7(y9.s,A7.s,Q),K=Q7(y9.l,A7.l,Q);return this.setHSL($,W,K),this}setFromVector3(J){return this.r=J.x,this.g=J.y,this.b=J.z,this}applyMatrix3(J){let Q=this.r,$=this.g,W=this.b,K=J.elements;return this.r=K[0]*Q+K[3]*$+K[6]*W,this.g=K[1]*Q+K[4]*$+K[7]*W,this.b=K[2]*Q+K[5]*$+K[8]*W,this}equals(J){return J.r===this.r&&J.g===this.g&&J.b===this.b}fromArray(J,Q=0){return this.r=J[Q],this.g=J[Q+1],this.b=J[Q+2],this}toArray(J=[],Q=0){return J[Q]=this.r,J[Q+1]=this.g,J[Q+2]=this.b,J}fromBufferAttribute(J,Q){return this.r=J.getX(Q),this.g=J.getY(Q),this.b=J.getZ(Q),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}var PJ=new g0;g0.NAMES=kK;class Q6 extends _J{constructor(){super();if(this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new b9,this.environmentIntensity=1,this.environmentRotation=new b9,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(J,Q){if(super.copy(J,Q),J.background!==null)this.background=J.background.clone();if(J.environment!==null)this.environment=J.environment.clone();if(J.fog!==null)this.fog=J.fog.clone();if(this.backgroundBlurriness=J.backgroundBlurriness,this.backgroundIntensity=J.backgroundIntensity,this.backgroundRotation.copy(J.backgroundRotation),this.environmentIntensity=J.environmentIntensity,this.environmentRotation.copy(J.environmentRotation),J.overrideMaterial!==null)this.overrideMaterial=J.overrideMaterial.clone();return this.matrixAutoUpdate=J.matrixAutoUpdate,this}toJSON(J){let Q=super.toJSON(J);if(this.fog!==null)Q.object.fog=this.fog.toJSON();return Q.object.backgroundBlurriness=this.backgroundBlurriness,Q.object.backgroundIntensity=this.backgroundIntensity,Q.object.backgroundRotation=this.backgroundRotation.toArray(),Q.object.environmentIntensity=this.environmentIntensity,Q.object.environmentRotation=this.environmentRotation.toArray(),Q}}var Q9=new f,V9=new f,w6=new f,B9=new f,L8=new f,k8=new f,XW=new f,_6=new f,T6=new f,S6=new f,j6=new UJ,y6=new UJ,f6=new UJ;class oJ{constructor(J=new f,Q=new f,$=new f){this.a=J,this.b=Q,this.c=$}static getNormal(J,Q,$,W){W.subVectors($,Q),Q9.subVectors(J,Q),W.cross(Q9);let K=W.lengthSq();if(K>0)return W.multiplyScalar(1/Math.sqrt(K));return W.set(0,0,0)}static getBarycoord(J,Q,$,W,K){Q9.subVectors(W,Q),V9.subVectors($,Q),w6.subVectors(J,Q);let Z=Q9.dot(Q9),H=Q9.dot(V9),Y=Q9.dot(w6),X=V9.dot(V9),U=V9.dot(w6),N=Z*X-H*H;if(N===0)return K.set(0,0,0),null;let E=1/N,G=(X*Y-H*U)*E,F=(Z*U-H*Y)*E;return K.set(1-G-F,F,G)}static containsPoint(J,Q,$,W){if(this.getBarycoord(J,Q,$,W,B9)===null)return!1;return B9.x>=0&&B9.y>=0&&B9.x+B9.y<=1}static getInterpolation(J,Q,$,W,K,Z,H,Y){if(this.getBarycoord(J,Q,$,W,B9)===null){if(Y.x=0,Y.y=0,"z"in Y)Y.z=0;if("w"in Y)Y.w=0;return null}return Y.setScalar(0),Y.addScaledVector(K,B9.x),Y.addScaledVector(Z,B9.y),Y.addScaledVector(H,B9.z),Y}static getInterpolatedAttribute(J,Q,$,W,K,Z){return j6.setScalar(0),y6.setScalar(0),f6.setScalar(0),j6.fromBufferAttribute(J,Q),y6.fromBufferAttribute(J,$),f6.fromBufferAttribute(J,W),Z.setScalar(0),Z.addScaledVector(j6,K.x),Z.addScaledVector(y6,K.y),Z.addScaledVector(f6,K.z),Z}static isFrontFacing(J,Q,$,W){return Q9.subVectors($,Q),V9.subVectors(J,Q),Q9.cross(V9).dot(W)<0}set(J,Q,$){return this.a.copy(J),this.b.copy(Q),this.c.copy($),this}setFromPointsAndIndices(J,Q,$,W){return this.a.copy(J[Q]),this.b.copy(J[$]),this.c.copy(J[W]),this}setFromAttributeAndIndices(J,Q,$,W){return this.a.fromBufferAttribute(J,Q),this.b.fromBufferAttribute(J,$),this.c.fromBufferAttribute(J,W),this}clone(){return new this.constructor().copy(this)}copy(J){return this.a.copy(J.a),this.b.copy(J.b),this.c.copy(J.c),this}getArea(){return Q9.subVectors(this.c,this.b),V9.subVectors(this.a,this.b),Q9.cross(V9).length()*0.5}getMidpoint(J){return J.addVectors(this.a,this.b).add(this.c).multiplyScalar(0.3333333333333333)}getNormal(J){return oJ.getNormal(this.a,this.b,this.c,J)}getPlane(J){return J.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(J,Q){return oJ.getBarycoord(J,this.a,this.b,this.c,Q)}getInterpolation(J,Q,$,W,K){return oJ.getInterpolation(J,this.a,this.b,this.c,Q,$,W,K)}containsPoint(J){return oJ.containsPoint(J,this.a,this.b,this.c)}isFrontFacing(J){return oJ.isFrontFacing(this.a,this.b,this.c,J)}intersectsBox(J){return J.intersectsTriangle(this)}closestPointToPoint(J,Q){let $=this.a,W=this.b,K=this.c,Z,H;L8.subVectors(W,$),k8.subVectors(K,$),_6.subVectors(J,$);let Y=L8.dot(_6),X=k8.dot(_6);if(Y<=0&&X<=0)return Q.copy($);T6.subVectors(J,W);let U=L8.dot(T6),N=k8.dot(T6);if(U>=0&&N<=U)return Q.copy(W);let E=Y*N-U*X;if(E<=0&&Y>=0&&U<=0)return Z=Y/(Y-U),Q.copy($).addScaledVector(L8,Z);S6.subVectors(J,K);let G=L8.dot(S6),F=k8.dot(S6);if(F>=0&&G<=F)return Q.copy(K);let L=G*X-Y*F;if(L<=0&&X>=0&&F<=0)return H=X/(X-F),Q.copy($).addScaledVector(k8,H);let I=U*F-G*N;if(I<=0&&N-U>=0&&G-F>=0)return XW.subVectors(K,W),H=(N-U)/(N-U+(G-F)),Q.copy(W).addScaledVector(XW,H);let D=1/(I+L+E);return Z=L*D,H=E*D,Q.copy($).addScaledVector(L8,Z).addScaledVector(k8,H)}equals(J){return J.a.equals(this.a)&&J.b.equals(this.b)&&J.c.equals(this.c)}}class Y9{constructor(J=new f(1/0,1/0,1/0),Q=new f(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=J,this.max=Q}set(J,Q){return this.min.copy(J),this.max.copy(Q),this}setFromArray(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q+=3)this.expandByPoint($9.fromArray(J,Q));return this}setFromBufferAttribute(J){this.makeEmpty();for(let Q=0,$=J.count;Q<$;Q++)this.expandByPoint($9.fromBufferAttribute(J,Q));return this}setFromPoints(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q++)this.expandByPoint(J[Q]);return this}setFromCenterAndSize(J,Q){let $=$9.copy(Q).multiplyScalar(0.5);return this.min.copy(J).sub($),this.max.copy(J).add($),this}setFromObject(J,Q=!1){return this.makeEmpty(),this.expandByObject(J,Q)}clone(){return new this.constructor().copy(this)}copy(J){return this.min.copy(J.min),this.max.copy(J.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(J){return this.isEmpty()?J.set(0,0,0):J.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(J){return this.isEmpty()?J.set(0,0,0):J.subVectors(this.max,this.min)}expandByPoint(J){return this.min.min(J),this.max.max(J),this}expandByVector(J){return this.min.sub(J),this.max.add(J),this}expandByScalar(J){return this.min.addScalar(-J),this.max.addScalar(J),this}expandByObject(J,Q=!1){J.updateWorldMatrix(!1,!1);let $=J.geometry;if($!==void 0){let K=$.getAttribute("position");if(Q===!0&&K!==void 0&&J.isInstancedMesh!==!0)for(let Z=0,H=K.count;Z<H;Z++){if(J.isMesh===!0)J.getVertexPosition(Z,$9);else $9.fromBufferAttribute(K,Z);$9.applyMatrix4(J.matrixWorld),this.expandByPoint($9)}else{if(J.boundingBox!==void 0){if(J.boundingBox===null)J.computeBoundingBox();C7.copy(J.boundingBox)}else{if($.boundingBox===null)$.computeBoundingBox();C7.copy($.boundingBox)}C7.applyMatrix4(J.matrixWorld),this.union(C7)}}let W=J.children;for(let K=0,Z=W.length;K<Z;K++)this.expandByObject(W[K],Q);return this}containsPoint(J){return J.x>=this.min.x&&J.x<=this.max.x&&J.y>=this.min.y&&J.y<=this.max.y&&J.z>=this.min.z&&J.z<=this.max.z}containsBox(J){return this.min.x<=J.min.x&&J.max.x<=this.max.x&&this.min.y<=J.min.y&&J.max.y<=this.max.y&&this.min.z<=J.min.z&&J.max.z<=this.max.z}getParameter(J,Q){return Q.set((J.x-this.min.x)/(this.max.x-this.min.x),(J.y-this.min.y)/(this.max.y-this.min.y),(J.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(J){return J.max.x>=this.min.x&&J.min.x<=this.max.x&&J.max.y>=this.min.y&&J.min.y<=this.max.y&&J.max.z>=this.min.z&&J.min.z<=this.max.z}intersectsSphere(J){return this.clampPoint(J.center,$9),$9.distanceToSquared(J.center)<=J.radius*J.radius}intersectsPlane(J){let Q,$;if(J.normal.x>0)Q=J.normal.x*this.min.x,$=J.normal.x*this.max.x;else Q=J.normal.x*this.max.x,$=J.normal.x*this.min.x;if(J.normal.y>0)Q+=J.normal.y*this.min.y,$+=J.normal.y*this.max.y;else Q+=J.normal.y*this.max.y,$+=J.normal.y*this.min.y;if(J.normal.z>0)Q+=J.normal.z*this.min.z,$+=J.normal.z*this.max.z;else Q+=J.normal.z*this.max.z,$+=J.normal.z*this.min.z;return Q<=-J.constant&&$>=-J.constant}intersectsTriangle(J){if(this.isEmpty())return!1;this.getCenter(r8),P7.subVectors(this.max,r8),V8.subVectors(J.a,r8),B8.subVectors(J.b,r8),I8.subVectors(J.c,r8),f9.subVectors(B8,V8),h9.subVectors(I8,B8),u9.subVectors(V8,I8);let Q=[0,-f9.z,f9.y,0,-h9.z,h9.y,0,-u9.z,u9.y,f9.z,0,-f9.x,h9.z,0,-h9.x,u9.z,0,-u9.x,-f9.y,f9.x,0,-h9.y,h9.x,0,-u9.y,u9.x,0];if(!h6(Q,V8,B8,I8,P7))return!1;if(Q=[1,0,0,0,1,0,0,0,1],!h6(Q,V8,B8,I8,P7))return!1;return w7.crossVectors(f9,h9),Q=[w7.x,w7.y,w7.z],h6(Q,V8,B8,I8,P7)}clampPoint(J,Q){return Q.copy(J).clamp(this.min,this.max)}distanceToPoint(J){return this.clampPoint(J,$9).distanceTo(J)}getBoundingSphere(J){if(this.isEmpty())J.makeEmpty();else this.getCenter(J.center),J.radius=this.getSize($9).length()*0.5;return J}intersect(J){if(this.min.max(J.min),this.max.min(J.max),this.isEmpty())this.makeEmpty();return this}union(J){return this.min.min(J.min),this.max.max(J.max),this}applyMatrix4(J){if(this.isEmpty())return this;return I9[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(J),I9[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(J),I9[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(J),I9[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(J),I9[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(J),I9[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(J),I9[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(J),I9[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(J),this.setFromPoints(I9),this}translate(J){return this.min.add(J),this.max.add(J),this}equals(J){return J.min.equals(this.min)&&J.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(J){return this.min.fromArray(J.min),this.max.fromArray(J.max),this}}var I9=[new f,new f,new f,new f,new f,new f,new f,new f],$9=new f,C7=new Y9,V8=new f,B8=new f,I8=new f,f9=new f,h9=new f,u9=new f,r8=new f,P7=new f,w7=new f,c9=new f;function h6(J,Q,$,W,K){for(let Z=0,H=J.length-3;Z<=H;Z+=3){c9.fromArray(J,Z);let Y=K.x*Math.abs(c9.x)+K.y*Math.abs(c9.y)+K.z*Math.abs(c9.z),X=Q.dot(c9),U=$.dot(c9),N=W.dot(c9);if(Math.max(-Math.max(X,U,N),Math.min(X,U,N))>Y)return!1}return!0}var qJ=new f,_7=new S0,qH=0;class W9 extends D9{constructor(J,Q,$=!1){super();if(Array.isArray(J))throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:qH++}),this.name="",this.array=J,this.itemSize=Q,this.count=J!==void 0?J.length/Q:0,this.normalized=$,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.name=J.name,this.array=new J.array.constructor(J.array),this.itemSize=J.itemSize,this.count=J.count,this.normalized=J.normalized,this.usage=J.usage,this.gpuType=J.gpuType,this}copyAt(J,Q,$){J*=this.itemSize,$*=Q.itemSize;for(let W=0,K=this.itemSize;W<K;W++)this.array[J+W]=Q.array[$+W];return this}copyArray(J){return this.array.set(J),this}applyMatrix3(J){if(this.itemSize===2)for(let Q=0,$=this.count;Q<$;Q++)_7.fromBufferAttribute(this,Q),_7.applyMatrix3(J),this.setXY(Q,_7.x,_7.y);else if(this.itemSize===3)for(let Q=0,$=this.count;Q<$;Q++)qJ.fromBufferAttribute(this,Q),qJ.applyMatrix3(J),this.setXYZ(Q,qJ.x,qJ.y,qJ.z);return this}applyMatrix4(J){for(let Q=0,$=this.count;Q<$;Q++)qJ.fromBufferAttribute(this,Q),qJ.applyMatrix4(J),this.setXYZ(Q,qJ.x,qJ.y,qJ.z);return this}applyNormalMatrix(J){for(let Q=0,$=this.count;Q<$;Q++)qJ.fromBufferAttribute(this,Q),qJ.applyNormalMatrix(J),this.setXYZ(Q,qJ.x,qJ.y,qJ.z);return this}transformDirection(J){for(let Q=0,$=this.count;Q<$;Q++)qJ.fromBufferAttribute(this,Q),qJ.transformDirection(J),this.setXYZ(Q,qJ.x,qJ.y,qJ.z);return this}set(J,Q=0){return this.array.set(J,Q),this}getComponent(J,Q){let $=this.array[J*this.itemSize+Q];if(this.normalized)$=w8($,this.array);return $}setComponent(J,Q,$){if(this.normalized)$=yJ($,this.array);return this.array[J*this.itemSize+Q]=$,this}getX(J){let Q=this.array[J*this.itemSize];if(this.normalized)Q=w8(Q,this.array);return Q}setX(J,Q){if(this.normalized)Q=yJ(Q,this.array);return this.array[J*this.itemSize]=Q,this}getY(J){let Q=this.array[J*this.itemSize+1];if(this.normalized)Q=w8(Q,this.array);return Q}setY(J,Q){if(this.normalized)Q=yJ(Q,this.array);return this.array[J*this.itemSize+1]=Q,this}getZ(J){let Q=this.array[J*this.itemSize+2];if(this.normalized)Q=w8(Q,this.array);return Q}setZ(J,Q){if(this.normalized)Q=yJ(Q,this.array);return this.array[J*this.itemSize+2]=Q,this}getW(J){let Q=this.array[J*this.itemSize+3];if(this.normalized)Q=w8(Q,this.array);return Q}setW(J,Q){if(this.normalized)Q=yJ(Q,this.array);return this.array[J*this.itemSize+3]=Q,this}setXY(J,Q,$){if(J*=this.itemSize,this.normalized)Q=yJ(Q,this.array),$=yJ($,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this}setXYZ(J,Q,$,W){if(J*=this.itemSize,this.normalized)Q=yJ(Q,this.array),$=yJ($,this.array),W=yJ(W,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this.array[J+2]=W,this}setXYZW(J,Q,$,W,K){if(J*=this.itemSize,this.normalized)Q=yJ(Q,this.array),$=yJ($,this.array),W=yJ(W,this.array),K=yJ(K,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this.array[J+2]=W,this.array[J+3]=K,this}onUpload(J){return this.onUploadCallback=J,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let J={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return J.name=this.name,J.usage=this.usage,J.gpuType=this.gpuType,J}dispose(){this.dispatchEvent({type:"dispose"})}}class $6 extends W9{constructor(J,Q,$){super(new Uint16Array(J),Q,$)}}class W6 extends W9{constructor(J,Q,$){super(new Uint32Array(J),Q,$)}}class IJ extends W9{constructor(J,Q,$){super(new Float32Array(J),Q,$)}}var EH=new Y9,t8=new f,v6=new f;class N7{constructor(J=new f,Q=-1){this.isSphere=!0,this.center=J,this.radius=Q}set(J,Q){return this.center.copy(J),this.radius=Q,this}setFromPoints(J,Q){let $=this.center;if(Q!==void 0)$.copy(Q);else EH.setFromPoints(J).getCenter($);let W=0;for(let K=0,Z=J.length;K<Z;K++)W=Math.max(W,$.distanceToSquared(J[K]));return this.radius=Math.sqrt(W),this}copy(J){return this.center.copy(J.center),this.radius=J.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(J){return J.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(J){return J.distanceTo(this.center)-this.radius}intersectsSphere(J){let Q=this.radius+J.radius;return J.center.distanceToSquared(this.center)<=Q*Q}intersectsBox(J){return J.intersectsSphere(this)}intersectsPlane(J){return Math.abs(J.distanceToPoint(this.center))<=this.radius}clampPoint(J,Q){let $=this.center.distanceToSquared(J);if(Q.copy(J),$>this.radius*this.radius)Q.sub(this.center).normalize(),Q.multiplyScalar(this.radius).add(this.center);return Q}getBoundingBox(J){if(this.isEmpty())return J.makeEmpty(),J;return J.set(this.center,this.center),J.expandByScalar(this.radius),J}applyMatrix4(J){return this.center.applyMatrix4(J),this.radius=this.radius*J.getMaxScaleOnAxis(),this}translate(J){return this.center.add(J),this}expandByPoint(J){if(this.isEmpty())return this.center.copy(J),this.radius=0,this;t8.subVectors(J,this.center);let Q=t8.lengthSq();if(Q>this.radius*this.radius){let $=Math.sqrt(Q),W=($-this.radius)*0.5;this.center.addScaledVector(t8,W/$),this.radius+=W}return this}union(J){if(J.isEmpty())return this;if(this.isEmpty())return this.copy(J),this;if(this.center.equals(J.center)===!0)this.radius=Math.max(this.radius,J.radius);else v6.subVectors(J.center,this.center).setLength(J.radius),this.expandByPoint(t8.copy(J.center).add(v6)),this.expandByPoint(t8.copy(J.center).sub(v6));return this}equals(J){return J.center.equals(this.center)&&J.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(J){return this.radius=J.radius,this.center.fromArray(J.center),this}}var FH=0,sJ=new KJ,b6=new _J,z8=new f,dJ=new Y9,e8=new Y9,kJ=new f;class gJ extends D9{constructor(){super();this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:FH++}),this.uuid=x8(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(J){if(Array.isArray(J))this.index=new((xZ(J))?W6:$6)(J,1);else this.index=J;return this}setIndirect(J,Q=0){return this.indirect=J,this.indirectOffset=Q,this}getIndirect(){return this.indirect}getAttribute(J){return this.attributes[J]}setAttribute(J,Q){return this.attributes[J]=Q,this}deleteAttribute(J){return delete this.attributes[J],this}hasAttribute(J){return this.attributes[J]!==void 0}addGroup(J,Q,$=0){this.groups.push({start:J,count:Q,materialIndex:$})}clearGroups(){this.groups=[]}setDrawRange(J,Q){this.drawRange.start=J,this.drawRange.count=Q}applyMatrix4(J){let Q=this.attributes.position;if(Q!==void 0)Q.applyMatrix4(J),Q.needsUpdate=!0;let $=this.attributes.normal;if($!==void 0){let K=new j0().getNormalMatrix(J);$.applyNormalMatrix(K),$.needsUpdate=!0}let W=this.attributes.tangent;if(W!==void 0)W.transformDirection(J),W.needsUpdate=!0;if(this.boundingBox!==null)this.computeBoundingBox();if(this.boundingSphere!==null)this.computeBoundingSphere();return this._transformed=!0,this}applyQuaternion(J){return sJ.makeRotationFromQuaternion(J),this.applyMatrix4(sJ),this}rotateX(J){return sJ.makeRotationX(J),this.applyMatrix4(sJ),this}rotateY(J){return sJ.makeRotationY(J),this.applyMatrix4(sJ),this}rotateZ(J){return sJ.makeRotationZ(J),this.applyMatrix4(sJ),this}translate(J,Q,$){return sJ.makeTranslation(J,Q,$),this.applyMatrix4(sJ),this}scale(J,Q,$){return sJ.makeScale(J,Q,$),this.applyMatrix4(sJ),this}lookAt(J){return b6.lookAt(J),b6.updateMatrix(),this.applyMatrix4(b6.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(z8).negate(),this.translate(z8.x,z8.y,z8.z),this}setFromPoints(J){let Q=this.getAttribute("position");if(Q===void 0){let $=[];for(let W=0,K=J.length;W<K;W++){let Z=J[W];$.push(Z.x,Z.y,Z.z||0)}this.setAttribute("position",new IJ($,3))}else{let $=Math.min(J.length,Q.count);for(let W=0;W<$;W++){let K=J[W];Q.setXYZ(W,K.x,K.y,K.z||0)}if(J.length>Q.count)P0("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.");Q.needsUpdate=!0}return this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new Y9;let J=this.attributes.position,Q=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){T0("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new f(-1/0,-1/0,-1/0),new f(1/0,1/0,1/0));return}if(J!==void 0){if(this.boundingBox.setFromBufferAttribute(J),Q)for(let $=0,W=Q.length;$<W;$++){let K=Q[$];if(dJ.setFromBufferAttribute(K),this.morphTargetsRelative)kJ.addVectors(this.boundingBox.min,dJ.min),this.boundingBox.expandByPoint(kJ),kJ.addVectors(this.boundingBox.max,dJ.max),this.boundingBox.expandByPoint(kJ);else this.boundingBox.expandByPoint(dJ.min),this.boundingBox.expandByPoint(dJ.max)}}else this.boundingBox.makeEmpty();if(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))T0('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new N7;let J=this.attributes.position,Q=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){T0("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new f,1/0);return}if(J){let $=this.boundingSphere.center;if(dJ.setFromBufferAttribute(J),Q)for(let K=0,Z=Q.length;K<Z;K++){let H=Q[K];if(e8.setFromBufferAttribute(H),this.morphTargetsRelative)kJ.addVectors(dJ.min,e8.min),dJ.expandByPoint(kJ),kJ.addVectors(dJ.max,e8.max),dJ.expandByPoint(kJ);else dJ.expandByPoint(e8.min),dJ.expandByPoint(e8.max)}dJ.getCenter($);let W=0;for(let K=0,Z=J.count;K<Z;K++)kJ.fromBufferAttribute(J,K),W=Math.max(W,$.distanceToSquared(kJ));if(Q)for(let K=0,Z=Q.length;K<Z;K++){let H=Q[K],Y=this.morphTargetsRelative;for(let X=0,U=H.count;X<U;X++){if(kJ.fromBufferAttribute(H,X),Y)z8.fromBufferAttribute(J,X),kJ.add(z8);W=Math.max(W,$.distanceToSquared(kJ))}}if(this.boundingSphere.radius=Math.sqrt(W),isNaN(this.boundingSphere.radius))T0('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let J=this.index,Q=this.attributes;if(J===null||Q.position===void 0||Q.normal===void 0||Q.uv===void 0){T0("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let{position:$,normal:W,uv:K}=Q,Z=this.getAttribute("tangent");if(Z===void 0||Z.count!==$.count)Z=new W9(new Float32Array(4*$.count),4),this.setAttribute("tangent",Z);let H=[],Y=[];for(let P=0;P<$.count;P++)H[P]=new f,Y[P]=new f;let X=new f,U=new f,N=new f,E=new S0,G=new S0,F=new S0,L=new f,I=new f;function D(P,M,B){X.fromBufferAttribute($,P),U.fromBufferAttribute($,M),N.fromBufferAttribute($,B),E.fromBufferAttribute(K,P),G.fromBufferAttribute(K,M),F.fromBufferAttribute(K,B),U.sub(X),N.sub(X),G.sub(E),F.sub(E);let l=1/(G.x*F.y-F.x*G.y);if(!isFinite(l))return;L.copy(U).multiplyScalar(F.y).addScaledVector(N,-G.y).multiplyScalar(l),I.copy(N).multiplyScalar(G.x).addScaledVector(U,-F.x).multiplyScalar(l),H[P].add(L),H[M].add(L),H[B].add(L),Y[P].add(I),Y[M].add(I),Y[B].add(I)}let q=this.groups;if(q.length===0)q=[{start:0,count:J.count}];for(let P=0,M=q.length;P<M;++P){let B=q[P],l=B.start,h=B.count;for(let v=l,r=l+h;v<r;v+=3)D(J.getX(v+0),J.getX(v+1),J.getX(v+2))}let A=new f,y=new f,V=new f,z=new f;function C(P){V.fromBufferAttribute(W,P),z.copy(V);let M=H[P];A.copy(M),A.sub(V.multiplyScalar(V.dot(M))).normalize(),y.crossVectors(z,M);let l=y.dot(Y[P])<0?-1:1;Z.setXYZW(P,A.x,A.y,A.z,l)}for(let P=0,M=q.length;P<M;++P){let B=q[P],l=B.start,h=B.count;for(let v=l,r=l+h;v<r;v+=3)C(J.getX(v+0)),C(J.getX(v+1)),C(J.getX(v+2))}this._transformed=!0}computeVertexNormals(){let J=this.index,Q=this.getAttribute("position");if(Q!==void 0){let $=this.getAttribute("normal");if($===void 0||$.count!==Q.count)$=new W9(new Float32Array(Q.count*3),3),this.setAttribute("normal",$);else for(let E=0,G=$.count;E<G;E++)$.setXYZ(E,0,0,0);let W=new f,K=new f,Z=new f,H=new f,Y=new f,X=new f,U=new f,N=new f;if(J)for(let E=0,G=J.count;E<G;E+=3){let F=J.getX(E+0),L=J.getX(E+1),I=J.getX(E+2);W.fromBufferAttribute(Q,F),K.fromBufferAttribute(Q,L),Z.fromBufferAttribute(Q,I),U.subVectors(Z,K),N.subVectors(W,K),U.cross(N),H.fromBufferAttribute($,F),Y.fromBufferAttribute($,L),X.fromBufferAttribute($,I),H.add(U),Y.add(U),X.add(U),$.setXYZ(F,H.x,H.y,H.z),$.setXYZ(L,Y.x,Y.y,Y.z),$.setXYZ(I,X.x,X.y,X.z)}else for(let E=0,G=Q.count;E<G;E+=3)W.fromBufferAttribute(Q,E+0),K.fromBufferAttribute(Q,E+1),Z.fromBufferAttribute(Q,E+2),U.subVectors(Z,K),N.subVectors(W,K),U.cross(N),$.setXYZ(E+0,U.x,U.y,U.z),$.setXYZ(E+1,U.x,U.y,U.z),$.setXYZ(E+2,U.x,U.y,U.z);this.normalizeNormals(),$.needsUpdate=!0}}normalizeNormals(){let J=this.attributes.normal;for(let Q=0,$=J.count;Q<$;Q++)kJ.fromBufferAttribute(J,Q),kJ.normalize(),J.setXYZ(Q,kJ.x,kJ.y,kJ.z)}toNonIndexed(){function J(H,Y){let{array:X,itemSize:U,normalized:N}=H,E=new X.constructor(Y.length*U),G=0,F=0;for(let L=0,I=Y.length;L<I;L++){if(H.isInterleavedBufferAttribute)G=Y[L]*H.data.stride+H.offset;else G=Y[L]*U;for(let D=0;D<U;D++)E[F++]=X[G++]}return new W9(E,U,N)}if(this.index===null)return P0("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let Q=new gJ,$=this.index.array,W=this.attributes;for(let H in W){let Y=W[H],X=J(Y,$);Q.setAttribute(H,X)}let K=this.morphAttributes;for(let H in K){let Y=[],X=K[H];for(let U=0,N=X.length;U<N;U++){let E=X[U],G=J(E,$);Y.push(G)}Q.morphAttributes[H]=Y}Q.morphTargetsRelative=this.morphTargetsRelative;let Z=this.groups;for(let H=0,Y=Z.length;H<Y;H++){let X=Z[H];Q.addGroup(X.start,X.count,X.materialIndex)}return Q}toJSON(){let J={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(J.uuid=this.uuid,J.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,J.name=this.name,Object.keys(this.userData).length>0)J.userData=this.userData;if(this.parameters!==void 0&&this._transformed!==!0){let Y=this.parameters;for(let X in Y)if(Y[X]!==void 0)J[X]=Y[X];return J}J.data={attributes:{}};let Q=this.index;if(Q!==null)J.data.index={type:Q.array.constructor.name,array:Array.prototype.slice.call(Q.array)};let $=this.attributes;for(let Y in $){let X=$[Y];J.data.attributes[Y]=X.toJSON(J.data)}let W={},K=!1;for(let Y in this.morphAttributes){let X=this.morphAttributes[Y],U=[];for(let N=0,E=X.length;N<E;N++){let G=X[N];U.push(G.toJSON(J.data))}if(U.length>0)W[Y]=U,K=!0}if(K)J.data.morphAttributes=W,J.data.morphTargetsRelative=this.morphTargetsRelative;let Z=this.groups;if(Z.length>0)J.data.groups=JSON.parse(JSON.stringify(Z));let H=this.boundingSphere;if(H!==null)J.data.boundingSphere=H.toJSON();return J}clone(){return new this.constructor().copy(this)}copy(J){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let Q={};this.name=J.name;let $=J.index;if($!==null)this.setIndex($.clone());let W=J.attributes;for(let X in W){let U=W[X];this.setAttribute(X,U.clone(Q))}let K=J.morphAttributes;for(let X in K){let U=[],N=K[X];for(let E=0,G=N.length;E<G;E++)U.push(N[E].clone(Q));this.morphAttributes[X]=U}this.morphTargetsRelative=J.morphTargetsRelative;let Z=J.groups;for(let X=0,U=Z.length;X<U;X++){let N=Z[X];this.addGroup(N.start,N.count,N.materialIndex)}let H=J.boundingBox;if(H!==null)this.boundingBox=H.clone();let Y=J.boundingSphere;if(Y!==null)this.boundingSphere=Y.clone();return this.drawRange.start=J.drawRange.start,this.drawRange.count=J.drawRange.count,this.userData=J.userData,this._transformed=J._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}var x6=new f,DH=new f,OH=new j0;class iJ{constructor(J=new f(1,0,0),Q=0){this.isPlane=!0,this.normal=J,this.constant=Q}set(J,Q){return this.normal.copy(J),this.constant=Q,this}setComponents(J,Q,$,W){return this.normal.set(J,Q,$),this.constant=W,this}setFromNormalAndCoplanarPoint(J,Q){return this.normal.copy(J),this.constant=-Q.dot(this.normal),this}setFromCoplanarPoints(J,Q,$){let W=x6.subVectors($,Q).cross(DH.subVectors(J,Q)).normalize();return this.setFromNormalAndCoplanarPoint(W,J),this}copy(J){return this.normal.copy(J.normal),this.constant=J.constant,this}normalize(){let J=1/this.normal.length();return this.normal.multiplyScalar(J),this.constant*=J,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(J){return this.normal.dot(J)+this.constant}distanceToSphere(J){return this.distanceToPoint(J.center)-J.radius}projectPoint(J,Q){return Q.copy(J).addScaledVector(this.normal,-this.distanceToPoint(J))}intersectLine(J,Q,$=!0){let W=J.delta(x6),K=this.normal.dot(W);if(K===0){if(this.distanceToPoint(J.start)===0)return Q.copy(J.start);return null}let Z=-(J.start.dot(this.normal)+this.constant)/K;if($===!0&&(Z<0||Z>1))return null;return Q.copy(J.start).addScaledVector(W,Z)}intersectsLine(J){let Q=this.distanceToPoint(J.start),$=this.distanceToPoint(J.end);return Q<0&&$>0||$<0&&Q>0}intersectsBox(J){return J.intersectsPlane(this)}intersectsSphere(J){return J.intersectsPlane(this)}coplanarPoint(J){return J.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(J,Q){let $=Q||OH.getNormalMatrix(J),W=this.coplanarPoint(x6).applyMatrix4(J),K=this.normal.applyMatrix3($).normalize();return this.constant=-W.dot(K),this}translate(J){return this.constant-=J.dot(this.normal),this}equals(J){return J.normal.equals(this.normal)&&J.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(J){return this.normal.fromArray(J.normal),this.constant=J.constant,this}}var RH=0;class g8 extends D9{constructor(){super();this.isMaterial=!0,Object.defineProperty(this,"id",{value:RH++}),this.uuid=x8(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new g0(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(J){if(this._alphaTest>0!==J>0)this.version++;this._alphaTest=J}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(J){if(J===void 0)return;for(let Q in J){let $=J[Q];if($===void 0){P0(`Material: parameter '${Q}' has value of undefined.`);continue}let W=this[Q];if(W===void 0){P0(`Material: '${Q}' is not a property of THREE.${this.type}.`);continue}if(W&&W.isColor)W.set($);else if(W&&W.isVector2&&($&&$.isVector2)||W&&W.isEuler&&($&&$.isEuler)||W&&W.isVector3&&($&&$.isVector3))W.copy($);else this[Q]=$}}toJSON(J){let Q=J===void 0||typeof J==="string";if(Q)J={textures:{},images:{}};let $={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};if($.uuid=this.uuid,$.type=this.type,$.blending=this.blending,$.side=this.side,$.shadowSide=this.shadowSide,$.vertexColors=this.vertexColors,$.opacity=this.opacity,$.transparent=this.transparent,$.blendSrc=this.blendSrc,$.blendDst=this.blendDst,$.blendEquation=this.blendEquation,$.blendSrcAlpha=this.blendSrcAlpha,$.blendDstAlpha=this.blendDstAlpha,$.blendEquationAlpha=this.blendEquationAlpha,$.blendColor=this.blendColor.getHex(),$.blendAlpha=this.blendAlpha,$.depthFunc=this.depthFunc,$.depthTest=this.depthTest,$.depthWrite=this.depthWrite,$.colorWrite=this.colorWrite,$.clipIntersection=this.clipIntersection,$.clipShadows=this.clipShadows,$.stencilWriteMask=this.stencilWriteMask,$.stencilFunc=this.stencilFunc,$.stencilRef=this.stencilRef,$.stencilFuncMask=this.stencilFuncMask,$.stencilFail=this.stencilFail,$.stencilZFail=this.stencilZFail,$.stencilZPass=this.stencilZPass,$.stencilWrite=this.stencilWrite,$.polygonOffset=this.polygonOffset,$.polygonOffsetFactor=this.polygonOffsetFactor,$.polygonOffsetUnits=this.polygonOffsetUnits,$.dithering=this.dithering,$.alphaTest=this.alphaTest,$.alphaHash=this.alphaHash,$.alphaToCoverage=this.alphaToCoverage,$.premultipliedAlpha=this.premultipliedAlpha,$.forceSinglePass=this.forceSinglePass,$.allowOverride=this.allowOverride,$.visible=this.visible,$.toneMapped=this.toneMapped,$.name=this.name,this.color&&this.color.isColor)$.color=this.color.getHex();if(this.roughness!==void 0)$.roughness=this.roughness;if(this.metalness!==void 0)$.metalness=this.metalness;if(this.sheen!==void 0)$.sheen=this.sheen;if(this.sheenColor&&this.sheenColor.isColor)$.sheenColor=this.sheenColor.getHex();if(this.sheenRoughness!==void 0)$.sheenRoughness=this.sheenRoughness;if(this.emissive&&this.emissive.isColor)$.emissive=this.emissive.getHex();if(this.emissiveIntensity!==void 0)$.emissiveIntensity=this.emissiveIntensity;if(this.specular&&this.specular.isColor)$.specular=this.specular.getHex();if(this.specularIntensity!==void 0)$.specularIntensity=this.specularIntensity;if(this.specularColor&&this.specularColor.isColor)$.specularColor=this.specularColor.getHex();if(this.shininess!==void 0)$.shininess=this.shininess;if(this.clearcoat!==void 0)$.clearcoat=this.clearcoat;if(this.clearcoatRoughness!==void 0)$.clearcoatRoughness=this.clearcoatRoughness;if(this.clearcoatMap&&this.clearcoatMap.isTexture)$.clearcoatMap=this.clearcoatMap.toJSON(J).uuid;if(this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture)$.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(J).uuid;if(this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture)$.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(J).uuid,$.clearcoatNormalScale=this.clearcoatNormalScale.toArray();if(this.sheenColorMap&&this.sheenColorMap.isTexture)$.sheenColorMap=this.sheenColorMap.toJSON(J).uuid;if(this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture)$.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(J).uuid;if(this.dispersion!==void 0)$.dispersion=this.dispersion;if(this.retroreflectivity!==void 0)$.retroreflectivity=this.retroreflectivity;if(this.iridescence!==void 0)$.iridescence=this.iridescence;if(this.iridescenceIOR!==void 0)$.iridescenceIOR=this.iridescenceIOR;if(this.iridescenceThicknessRange!==void 0)$.iridescenceThicknessRange=this.iridescenceThicknessRange;if(this.iridescenceMap&&this.iridescenceMap.isTexture)$.iridescenceMap=this.iridescenceMap.toJSON(J).uuid;if(this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture)$.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(J).uuid;if(this.anisotropy!==void 0)$.anisotropy=this.anisotropy;if(this.anisotropyRotation!==void 0)$.anisotropyRotation=this.anisotropyRotation;if(this.anisotropyMap&&this.anisotropyMap.isTexture)$.anisotropyMap=this.anisotropyMap.toJSON(J).uuid;if(this.map&&this.map.isTexture)$.map=this.map.toJSON(J).uuid;if(this.matcap&&this.matcap.isTexture)$.matcap=this.matcap.toJSON(J).uuid;if(this.alphaMap&&this.alphaMap.isTexture)$.alphaMap=this.alphaMap.toJSON(J).uuid;if(this.lightMap&&this.lightMap.isTexture)$.lightMap=this.lightMap.toJSON(J).uuid,$.lightMapIntensity=this.lightMapIntensity;if(this.aoMap&&this.aoMap.isTexture)$.aoMap=this.aoMap.toJSON(J).uuid,$.aoMapIntensity=this.aoMapIntensity;if(this.bumpMap&&this.bumpMap.isTexture)$.bumpMap=this.bumpMap.toJSON(J).uuid,$.bumpScale=this.bumpScale;if(this.normalMap&&this.normalMap.isTexture)$.normalMap=this.normalMap.toJSON(J).uuid,$.normalMapType=this.normalMapType,$.normalScale=this.normalScale.toArray();if(this.displacementMap&&this.displacementMap.isTexture)$.displacementMap=this.displacementMap.toJSON(J).uuid,$.displacementScale=this.displacementScale,$.displacementBias=this.displacementBias;if(this.roughnessMap&&this.roughnessMap.isTexture)$.roughnessMap=this.roughnessMap.toJSON(J).uuid;if(this.metalnessMap&&this.metalnessMap.isTexture)$.metalnessMap=this.metalnessMap.toJSON(J).uuid;if(this.emissiveMap&&this.emissiveMap.isTexture)$.emissiveMap=this.emissiveMap.toJSON(J).uuid;if(this.specularMap&&this.specularMap.isTexture)$.specularMap=this.specularMap.toJSON(J).uuid;if(this.specularIntensityMap&&this.specularIntensityMap.isTexture)$.specularIntensityMap=this.specularIntensityMap.toJSON(J).uuid;if(this.specularColorMap&&this.specularColorMap.isTexture)$.specularColorMap=this.specularColorMap.toJSON(J).uuid;if(this.envMap&&this.envMap.isTexture){if($.envMap=this.envMap.toJSON(J).uuid,this.combine!==void 0)$.combine=this.combine}if(this.envMapRotation!==void 0)$.envMapRotation=this.envMapRotation.toArray();if(this.envMapIntensity!==void 0)$.envMapIntensity=this.envMapIntensity;if(this.reflectivity!==void 0)$.reflectivity=this.reflectivity;if(this.refractionRatio!==void 0)$.refractionRatio=this.refractionRatio;if(this.gradientMap&&this.gradientMap.isTexture)$.gradientMap=this.gradientMap.toJSON(J).uuid;if(this.transmission!==void 0)$.transmission=this.transmission;if(this.transmissionMap&&this.transmissionMap.isTexture)$.transmissionMap=this.transmissionMap.toJSON(J).uuid;if(this.thickness!==void 0)$.thickness=this.thickness;if(this.thicknessMap&&this.thicknessMap.isTexture)$.thicknessMap=this.thicknessMap.toJSON(J).uuid;if(this.attenuationDistance!==void 0)$.attenuationDistance=this.attenuationDistance;if(this.attenuationColor!==void 0)$.attenuationColor=this.attenuationColor.getHex();if(this.size!==void 0)$.size=this.size;if(this.sizeAttenuation!==void 0)$.sizeAttenuation=this.sizeAttenuation;if(Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0)$.clippingPlanes=this.clippingPlanes.map((K)=>K.toJSON());if(this.rotation!==void 0)$.rotation=this.rotation;if(this.depthPacking!==void 0)$.depthPacking=this.depthPacking;if(this.linewidth!==void 0)$.linewidth=this.linewidth;if(this.linecap!==void 0)$.linecap=this.linecap;if(this.linejoin!==void 0)$.linejoin=this.linejoin;if(this.dashSize!==void 0)$.dashSize=this.dashSize;if(this.gapSize!==void 0)$.gapSize=this.gapSize;if(this.scale!==void 0)$.scale=this.scale;if(this.wireframe!==void 0)$.wireframe=this.wireframe;if(this.wireframeLinewidth!==void 0)$.wireframeLinewidth=this.wireframeLinewidth;if(this.wireframeLinecap!==void 0)$.wireframeLinecap=this.wireframeLinecap;if(this.wireframeLinejoin!==void 0)$.wireframeLinejoin=this.wireframeLinejoin;if(this.flatShading!==void 0)$.flatShading=this.flatShading;if(this.fog!==void 0)$.fog=this.fog;if(Object.keys(this.userData).length>0)$.userData=this.userData;function W(K){let Z=[];for(let H in K){let Y=K[H];delete Y.metadata,Z.push(Y)}return Z}if(Q){let K=W(J.textures),Z=W(J.images);if(K.length>0)$.textures=K;if(Z.length>0)$.images=Z}return $}fromJSON(J,Q){if(J.uuid!==void 0)this.uuid=J.uuid;if(J.name!==void 0)this.name=J.name;if(J.color!==void 0&&this.color!==void 0)this.color.setHex(J.color);if(J.roughness!==void 0)this.roughness=J.roughness;if(J.metalness!==void 0)this.metalness=J.metalness;if(J.sheen!==void 0)this.sheen=J.sheen;if(J.sheenColor!==void 0)this.sheenColor=new g0().setHex(J.sheenColor);if(J.sheenRoughness!==void 0)this.sheenRoughness=J.sheenRoughness;if(J.emissive!==void 0&&this.emissive!==void 0)this.emissive.setHex(J.emissive);if(J.specular!==void 0&&this.specular!==void 0)this.specular.setHex(J.specular);if(J.specularIntensity!==void 0)this.specularIntensity=J.specularIntensity;if(J.specularColor!==void 0&&this.specularColor!==void 0)this.specularColor.setHex(J.specularColor);if(J.shininess!==void 0)this.shininess=J.shininess;if(J.clearcoat!==void 0)this.clearcoat=J.clearcoat;if(J.clearcoatRoughness!==void 0)this.clearcoatRoughness=J.clearcoatRoughness;if(J.dispersion!==void 0)this.dispersion=J.dispersion;if(J.retroreflectivity!==void 0)this.retroreflectivity=J.retroreflectivity;if(J.iridescence!==void 0)this.iridescence=J.iridescence;if(J.iridescenceIOR!==void 0)this.iridescenceIOR=J.iridescenceIOR;if(J.iridescenceThicknessRange!==void 0)this.iridescenceThicknessRange=J.iridescenceThicknessRange;if(J.transmission!==void 0)this.transmission=J.transmission;if(J.thickness!==void 0)this.thickness=J.thickness;if(J.attenuationDistance!==void 0)this.attenuationDistance=J.attenuationDistance;if(J.attenuationColor!==void 0&&this.attenuationColor!==void 0)this.attenuationColor.setHex(J.attenuationColor);if(J.anisotropy!==void 0)this.anisotropy=J.anisotropy;if(J.anisotropyRotation!==void 0)this.anisotropyRotation=J.anisotropyRotation;if(J.fog!==void 0)this.fog=J.fog;if(J.flatShading!==void 0)this.flatShading=J.flatShading;if(J.blending!==void 0)this.blending=J.blending;if(J.combine!==void 0)this.combine=J.combine;if(J.side!==void 0)this.side=J.side;if(J.shadowSide!==void 0)this.shadowSide=J.shadowSide;if(J.opacity!==void 0)this.opacity=J.opacity;if(J.transparent!==void 0)this.transparent=J.transparent;if(J.alphaTest!==void 0)this.alphaTest=J.alphaTest;if(J.alphaHash!==void 0)this.alphaHash=J.alphaHash;if(J.depthFunc!==void 0)this.depthFunc=J.depthFunc;if(J.depthTest!==void 0)this.depthTest=J.depthTest;if(J.depthWrite!==void 0)this.depthWrite=J.depthWrite;if(J.colorWrite!==void 0)this.colorWrite=J.colorWrite;if(J.clippingPlanes!==void 0)this.clippingPlanes=J.clippingPlanes.map(($)=>new iJ().fromJSON($));if(J.clipIntersection!==void 0)this.clipIntersection=J.clipIntersection;if(J.clipShadows!==void 0)this.clipShadows=J.clipShadows;if(J.depthPacking!==void 0)this.depthPacking=J.depthPacking;if(J.blendSrc!==void 0)this.blendSrc=J.blendSrc;if(J.blendDst!==void 0)this.blendDst=J.blendDst;if(J.blendEquation!==void 0)this.blendEquation=J.blendEquation;if(J.blendSrcAlpha!==void 0)this.blendSrcAlpha=J.blendSrcAlpha;if(J.blendDstAlpha!==void 0)this.blendDstAlpha=J.blendDstAlpha;if(J.blendEquationAlpha!==void 0)this.blendEquationAlpha=J.blendEquationAlpha;if(J.blendColor!==void 0&&this.blendColor!==void 0)this.blendColor.setHex(J.blendColor);if(J.blendAlpha!==void 0)this.blendAlpha=J.blendAlpha;if(J.stencilWriteMask!==void 0)this.stencilWriteMask=J.stencilWriteMask;if(J.stencilFunc!==void 0)this.stencilFunc=J.stencilFunc;if(J.stencilRef!==void 0)this.stencilRef=J.stencilRef;if(J.stencilFuncMask!==void 0)this.stencilFuncMask=J.stencilFuncMask;if(J.stencilFail!==void 0)this.stencilFail=J.stencilFail;if(J.stencilZFail!==void 0)this.stencilZFail=J.stencilZFail;if(J.stencilZPass!==void 0)this.stencilZPass=J.stencilZPass;if(J.stencilWrite!==void 0)this.stencilWrite=J.stencilWrite;if(J.wireframe!==void 0)this.wireframe=J.wireframe;if(J.wireframeLinewidth!==void 0)this.wireframeLinewidth=J.wireframeLinewidth;if(J.wireframeLinecap!==void 0)this.wireframeLinecap=J.wireframeLinecap;if(J.wireframeLinejoin!==void 0)this.wireframeLinejoin=J.wireframeLinejoin;if(J.rotation!==void 0)this.rotation=J.rotation;if(J.linewidth!==void 0)this.linewidth=J.linewidth;if(J.linecap!==void 0)this.linecap=J.linecap;if(J.linejoin!==void 0)this.linejoin=J.linejoin;if(J.dashSize!==void 0)this.dashSize=J.dashSize;if(J.gapSize!==void 0)this.gapSize=J.gapSize;if(J.scale!==void 0)this.scale=J.scale;if(J.polygonOffset!==void 0)this.polygonOffset=J.polygonOffset;if(J.polygonOffsetFactor!==void 0)this.polygonOffsetFactor=J.polygonOffsetFactor;if(J.polygonOffsetUnits!==void 0)this.polygonOffsetUnits=J.polygonOffsetUnits;if(J.dithering!==void 0)this.dithering=J.dithering;if(J.alphaToCoverage!==void 0)this.alphaToCoverage=J.alphaToCoverage;if(J.premultipliedAlpha!==void 0)this.premultipliedAlpha=J.premultipliedAlpha;if(J.forceSinglePass!==void 0)this.forceSinglePass=J.forceSinglePass;if(J.allowOverride!==void 0)this.allowOverride=J.allowOverride;if(J.visible!==void 0)this.visible=J.visible;if(J.toneMapped!==void 0)this.toneMapped=J.toneMapped;if(J.userData!==void 0)this.userData=J.userData;if(J.vertexColors!==void 0)if(typeof J.vertexColors==="number")this.vertexColors=J.vertexColors>0;else this.vertexColors=J.vertexColors;if(J.size!==void 0)this.size=J.size;if(J.sizeAttenuation!==void 0)this.sizeAttenuation=J.sizeAttenuation;if(J.map!==void 0)this.map=Q[J.map]||null;if(J.matcap!==void 0)this.matcap=Q[J.matcap]||null;if(J.alphaMap!==void 0)this.alphaMap=Q[J.alphaMap]||null;if(J.bumpMap!==void 0)this.bumpMap=Q[J.bumpMap]||null;if(J.bumpScale!==void 0)this.bumpScale=J.bumpScale;if(J.normalMap!==void 0)this.normalMap=Q[J.normalMap]||null;if(J.normalMapType!==void 0)this.normalMapType=J.normalMapType;if(J.normalScale!==void 0){let $=J.normalScale;if(Array.isArray($)===!1)$=[$,$];this.normalScale=new S0().fromArray($)}if(J.displacementMap!==void 0)this.displacementMap=Q[J.displacementMap]||null;if(J.displacementScale!==void 0)this.displacementScale=J.displacementScale;if(J.displacementBias!==void 0)this.displacementBias=J.displacementBias;if(J.roughnessMap!==void 0)this.roughnessMap=Q[J.roughnessMap]||null;if(J.metalnessMap!==void 0)this.metalnessMap=Q[J.metalnessMap]||null;if(J.emissiveMap!==void 0)this.emissiveMap=Q[J.emissiveMap]||null;if(J.emissiveIntensity!==void 0)this.emissiveIntensity=J.emissiveIntensity;if(J.specularMap!==void 0)this.specularMap=Q[J.specularMap]||null;if(J.specularIntensityMap!==void 0)this.specularIntensityMap=Q[J.specularIntensityMap]||null;if(J.specularColorMap!==void 0)this.specularColorMap=Q[J.specularColorMap]||null;if(J.envMap!==void 0)this.envMap=Q[J.envMap]||null;if(J.envMapRotation!==void 0)this.envMapRotation.fromArray(J.envMapRotation);if(J.envMapIntensity!==void 0)this.envMapIntensity=J.envMapIntensity;if(J.reflectivity!==void 0)this.reflectivity=J.reflectivity;if(J.refractionRatio!==void 0)this.refractionRatio=J.refractionRatio;if(J.lightMap!==void 0)this.lightMap=Q[J.lightMap]||null;if(J.lightMapIntensity!==void 0)this.lightMapIntensity=J.lightMapIntensity;if(J.aoMap!==void 0)this.aoMap=Q[J.aoMap]||null;if(J.aoMapIntensity!==void 0)this.aoMapIntensity=J.aoMapIntensity;if(J.gradientMap!==void 0)this.gradientMap=Q[J.gradientMap]||null;if(J.clearcoatMap!==void 0)this.clearcoatMap=Q[J.clearcoatMap]||null;if(J.clearcoatRoughnessMap!==void 0)this.clearcoatRoughnessMap=Q[J.clearcoatRoughnessMap]||null;if(J.clearcoatNormalMap!==void 0)this.clearcoatNormalMap=Q[J.clearcoatNormalMap]||null;if(J.clearcoatNormalScale!==void 0)this.clearcoatNormalScale=new S0().fromArray(J.clearcoatNormalScale);if(J.iridescenceMap!==void 0)this.iridescenceMap=Q[J.iridescenceMap]||null;if(J.iridescenceThicknessMap!==void 0)this.iridescenceThicknessMap=Q[J.iridescenceThicknessMap]||null;if(J.transmissionMap!==void 0)this.transmissionMap=Q[J.transmissionMap]||null;if(J.thicknessMap!==void 0)this.thicknessMap=Q[J.thicknessMap]||null;if(J.anisotropyMap!==void 0)this.anisotropyMap=Q[J.anisotropyMap]||null;if(J.sheenColorMap!==void 0)this.sheenColorMap=Q[J.sheenColorMap]||null;if(J.sheenRoughnessMap!==void 0)this.sheenRoughnessMap=Q[J.sheenRoughnessMap]||null;return this}clone(){return new this.constructor().copy(this)}copy(J){this.name=J.name,this.blending=J.blending,this.side=J.side,this.vertexColors=J.vertexColors,this.opacity=J.opacity,this.transparent=J.transparent,this.blendSrc=J.blendSrc,this.blendDst=J.blendDst,this.blendEquation=J.blendEquation,this.blendSrcAlpha=J.blendSrcAlpha,this.blendDstAlpha=J.blendDstAlpha,this.blendEquationAlpha=J.blendEquationAlpha,this.blendColor.copy(J.blendColor),this.blendAlpha=J.blendAlpha,this.depthFunc=J.depthFunc,this.depthTest=J.depthTest,this.depthWrite=J.depthWrite,this.stencilWriteMask=J.stencilWriteMask,this.stencilFunc=J.stencilFunc,this.stencilRef=J.stencilRef,this.stencilFuncMask=J.stencilFuncMask,this.stencilFail=J.stencilFail,this.stencilZFail=J.stencilZFail,this.stencilZPass=J.stencilZPass,this.stencilWrite=J.stencilWrite;let Q=J.clippingPlanes,$=null;if(Q!==null){let W=Q.length;$=Array(W);for(let K=0;K!==W;++K)$[K]=Q[K].clone()}return this.clippingPlanes=$,this.clipIntersection=J.clipIntersection,this.clipShadows=J.clipShadows,this.shadowSide=J.shadowSide,this.colorWrite=J.colorWrite,this.precision=J.precision,this.polygonOffset=J.polygonOffset,this.polygonOffsetFactor=J.polygonOffsetFactor,this.polygonOffsetUnits=J.polygonOffsetUnits,this.dithering=J.dithering,this.alphaTest=J.alphaTest,this.alphaHash=J.alphaHash,this.alphaToCoverage=J.alphaToCoverage,this.premultipliedAlpha=J.premultipliedAlpha,this.forceSinglePass=J.forceSinglePass,this.allowOverride=J.allowOverride,this.visible=J.visible,this.toneMapped=J.toneMapped,this.userData=JSON.parse(JSON.stringify(J.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(J){if(J===!0)this.version++}}var z9=new f,g6=new f,T7=new f,S7=new f;class p8{constructor(J=new f,Q=new f(0,0,-1)){this.origin=J,this.direction=Q}set(J,Q){return this.origin.copy(J),this.direction.copy(Q),this}copy(J){return this.origin.copy(J.origin),this.direction.copy(J.direction),this}at(J,Q){return Q.copy(this.origin).addScaledVector(this.direction,J)}lookAt(J){return this.direction.copy(J).sub(this.origin).normalize(),this}recast(J){return this.origin.copy(this.at(J,z9)),this}closestPointToPoint(J,Q){Q.subVectors(J,this.origin);let $=Q.dot(this.direction);if($<0)return Q.copy(this.origin);return Q.copy(this.origin).addScaledVector(this.direction,$)}distanceToPoint(J){return Math.sqrt(this.distanceSqToPoint(J))}distanceSqToPoint(J){let Q=z9.subVectors(J,this.origin).dot(this.direction);if(Q<0)return this.origin.distanceToSquared(J);return z9.copy(this.origin).addScaledVector(this.direction,Q),z9.distanceToSquared(J)}distanceSqToSegment(J,Q,$,W){g6.copy(J).add(Q).multiplyScalar(0.5),T7.copy(Q).sub(J).normalize(),S7.copy(this.origin).sub(g6);let K=J.distanceTo(Q)*0.5,Z=-this.direction.dot(T7),H=S7.dot(this.direction),Y=-S7.dot(T7),X=S7.lengthSq(),U=Math.abs(1-Z*Z),N,E,G,F;if(U>0)if(N=Z*Y-H,E=Z*H-Y,F=K*U,N>=0)if(E>=-F)if(E<=F){let L=1/U;N*=L,E*=L,G=N*(N+Z*E+2*H)+E*(Z*N+E+2*Y)+X}else E=K,N=Math.max(0,-(Z*E+H)),G=-N*N+E*(E+2*Y)+X;else E=-K,N=Math.max(0,-(Z*E+H)),G=-N*N+E*(E+2*Y)+X;else if(E<=-F)N=Math.max(0,-(-Z*K+H)),E=N>0?-K:Math.min(Math.max(-K,-Y),K),G=-N*N+E*(E+2*Y)+X;else if(E<=F)N=0,E=Math.min(Math.max(-K,-Y),K),G=E*(E+2*Y)+X;else N=Math.max(0,-(Z*K+H)),E=N>0?K:Math.min(Math.max(-K,-Y),K),G=-N*N+E*(E+2*Y)+X;else E=Z>0?-K:K,N=Math.max(0,-(Z*E+H)),G=-N*N+E*(E+2*Y)+X;if($)$.copy(this.origin).addScaledVector(this.direction,N);if(W)W.copy(g6).addScaledVector(T7,E);return G}intersectSphere(J,Q){if(J.radius<0)return null;z9.subVectors(J.center,this.origin);let $=z9.dot(this.direction),W=z9.dot(z9)-$*$,K=J.radius*J.radius;if(W>K)return null;let Z=Math.sqrt(K-W),H=$-Z,Y=$+Z;if(Y<0)return null;if(H<0)return this.at(Y,Q);return this.at(H,Q)}intersectsSphere(J){if(J.radius<0)return!1;return this.distanceSqToPoint(J.center)<=J.radius*J.radius}distanceToPlane(J){let Q=J.normal.dot(this.direction);if(Q===0){if(J.distanceToPoint(this.origin)===0)return 0;return null}let $=-(this.origin.dot(J.normal)+J.constant)/Q;return $>=0?$:null}intersectPlane(J,Q){let $=this.distanceToPlane(J);if($===null)return null;return this.at($,Q)}intersectsPlane(J){let Q=J.distanceToPoint(this.origin);if(Q===0)return!0;if(J.normal.dot(this.direction)*Q<0)return!0;return!1}intersectBox(J,Q){let $,W,K,Z,H,Y,X=1/this.direction.x,U=1/this.direction.y,N=1/this.direction.z,E=this.origin;if(X>=0)$=(J.min.x-E.x)*X,W=(J.max.x-E.x)*X;else $=(J.max.x-E.x)*X,W=(J.min.x-E.x)*X;if(U>=0)K=(J.min.y-E.y)*U,Z=(J.max.y-E.y)*U;else K=(J.max.y-E.y)*U,Z=(J.min.y-E.y)*U;if($>Z||K>W)return null;if(K>$||isNaN($))$=K;if(Z<W||isNaN(W))W=Z;if(N>=0)H=(J.min.z-E.z)*N,Y=(J.max.z-E.z)*N;else H=(J.max.z-E.z)*N,Y=(J.min.z-E.z)*N;if($>Y||H>W)return null;if(H>$||$!==$)$=H;if(Y<W||W!==W)W=Y;if(W<0)return null;return this.at($>=0?$:W,Q)}intersectsBox(J){return this.intersectBox(J,z9)!==null}intersectTriangle(J,Q,$,W,K){let Z=this.origin,H=this.direction,Y=H.x,X=H.y,U=H.z,N=J.x-Z.x,E=J.y-Z.y,G=J.z-Z.z,F=Q.x-Z.x,L=Q.y-Z.y,I=Q.z-Z.z,D=$.x-Z.x,q=$.y-Z.y,A=$.z-Z.z,y=Math.abs(Y),V=Math.abs(X),z=Math.abs(U),C,P,M,B,l,h,v,r,S,d,o,m;if(y>=V&&y>=z)if(M=Y,h=N,S=F,m=D,Y>=0)C=X,P=U,B=E,l=G,v=L,r=I,d=q,o=A;else C=U,P=X,B=G,l=E,v=I,r=L,d=A,o=q;else if(V>=z)if(M=X,h=E,S=L,m=q,X>=0)C=U,P=Y,B=G,l=N,v=I,r=F,d=A,o=D;else C=Y,P=U,B=N,l=G,v=F,r=I,d=D,o=A;else if(M=U,h=G,S=I,m=A,U>=0)C=Y,P=X,B=N,l=E,v=F,r=L,d=D,o=q;else C=X,P=Y,B=E,l=N,v=L,r=F,d=q,o=D;if(M===0)return null;let Q0=C/M,c=P/M,a=1/M,J0=B-Q0*h,w0=l-c*h,z0=v-Q0*S,QJ=r-c*S,v0=d-Q0*m,n=o-c*m,$0=v0*QJ-n*z0,K0=J0*n-w0*v0,A0=z0*w0-QJ*J0;if(W){if($0<0||K0<0||A0<0)return null}else if(($0<0||K0<0||A0<0)&&($0>0||K0>0||A0>0))return null;let _0=$0+K0+A0;if(_0===0)return null;let B0=a*($0*h+K0*S+A0*m);if(_0>0?B0<0:B0>0)return null;return this.at(B0/_0,K)}applyMatrix4(J){return this.origin.applyMatrix4(J),this.direction.transformDirection(J),this}equals(J){return J.origin.equals(this.origin)&&J.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Q8 extends g8{constructor(J){super();this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new g0(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new b9,this.combine=0,this.reflectivity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.fog=J.fog,this}}var UW=new KJ,n9=new p8,j7=new N7,GW=new f,y7=new f,f7=new f,h7=new f,p6=new f,v7=new f,NW=new f,b7=new f;class zJ extends _J{constructor(J=new gJ,Q=new Q8){super();this.isMesh=!0,this.type="Mesh",this.geometry=J,this.material=Q,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(J,Q){if(super.copy(J,Q),J.morphTargetInfluences!==void 0)this.morphTargetInfluences=J.morphTargetInfluences.slice();if(J.morphTargetDictionary!==void 0)this.morphTargetDictionary=Object.assign({},J.morphTargetDictionary);return this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}updateMorphTargets(){let Q=this.geometry.morphAttributes,$=Object.keys(Q);if($.length>0){let W=Q[$[0]];if(W!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let K=0,Z=W.length;K<Z;K++){let H=W[K].name||String(K);this.morphTargetInfluences.push(0),this.morphTargetDictionary[H]=K}}}}getVertexPosition(J,Q){let $=this.geometry,W=$.attributes.position,K=$.morphAttributes.position,Z=$.morphTargetsRelative;Q.fromBufferAttribute(W,J);let H=this.morphTargetInfluences;if(K&&H){v7.set(0,0,0);for(let Y=0,X=K.length;Y<X;Y++){let U=H[Y],N=K[Y];if(U===0)continue;if(p6.fromBufferAttribute(N,J),Z)v7.addScaledVector(p6,U);else v7.addScaledVector(p6.sub(Q),U)}Q.add(v7)}return Q}intersectsFrustum(J){return J.intersectsObject(this)}raycast(J,Q){let $=this.geometry,W=this.material,K=this.matrixWorld;if(W===void 0)return;if($.boundingSphere===null)$.computeBoundingSphere();if(j7.copy($.boundingSphere),j7.applyMatrix4(K),n9.copy(J.ray).recast(J.near),j7.containsPoint(n9.origin)===!1){if(n9.intersectSphere(j7,GW)===null)return;if(n9.origin.distanceToSquared(GW)>(J.far-J.near)**2)return}if(UW.copy(K).invert(),n9.copy(J.ray).applyMatrix4(UW),$.boundingBox!==null){if(n9.intersectsBox($.boundingBox)===!1)return}this._computeIntersections(J,Q,n9)}_computeIntersections(J,Q,$){let W,K=this.geometry,Z=this.material,H=K.index,Y=K.attributes.position,X=K.attributes.uv,U=K.attributes.uv1,N=K.attributes.normal,E=K.groups,G=K.drawRange;if(H!==null)if(Array.isArray(Z))for(let F=0,L=E.length;F<L;F++){let I=E[F],D=Z[I.materialIndex],q=Math.max(I.start,G.start),A=Math.min(H.count,Math.min(I.start+I.count,G.start+G.count));for(let y=q,V=A;y<V;y+=3){let z=H.getX(y),C=H.getX(y+1),P=H.getX(y+2);if(W=x7(this,D,J,$,X,U,N,z,C,P),W)W.faceIndex=Math.floor(y/3),W.face.materialIndex=I.materialIndex,Q.push(W)}}else{let F=Math.max(0,G.start),L=Math.min(H.count,G.start+G.count);for(let I=F,D=L;I<D;I+=3){let q=H.getX(I),A=H.getX(I+1),y=H.getX(I+2);if(W=x7(this,Z,J,$,X,U,N,q,A,y),W)W.faceIndex=Math.floor(I/3),Q.push(W)}}else if(Y!==void 0)if(Array.isArray(Z))for(let F=0,L=E.length;F<L;F++){let I=E[F],D=Z[I.materialIndex],q=Math.max(I.start,G.start),A=Math.min(Y.count,Math.min(I.start+I.count,G.start+G.count));for(let y=q,V=A;y<V;y+=3){let z=y,C=y+1,P=y+2;if(W=x7(this,D,J,$,X,U,N,z,C,P),W)W.faceIndex=Math.floor(y/3),W.face.materialIndex=I.materialIndex,Q.push(W)}}else{let F=Math.max(0,G.start),L=Math.min(Y.count,G.start+G.count);for(let I=F,D=L;I<D;I+=3){let q=I,A=I+1,y=I+2;if(W=x7(this,Z,J,$,X,U,N,q,A,y),W)W.faceIndex=Math.floor(I/3),Q.push(W)}}}}function MH(J,Q,$,W,K,Z,H,Y){let X;if(Q.side===1)X=W.intersectTriangle(H,Z,K,!0,Y);else X=W.intersectTriangle(K,Z,H,Q.side===0,Y);if(X===null)return null;b7.copy(Y),b7.applyMatrix4(J.matrixWorld);let U=$.ray.origin.distanceTo(b7);if(U<$.near||U>$.far)return null;return{distance:U,point:b7.clone(),object:J}}function x7(J,Q,$,W,K,Z,H,Y,X,U){J.getVertexPosition(Y,y7),J.getVertexPosition(X,f7),J.getVertexPosition(U,h7);let N=MH(J,Q,$,W,y7,f7,h7,NW);if(N){let E=new f;if(oJ.getBarycoord(NW,y7,f7,h7,E),K)N.uv=oJ.getInterpolatedAttribute(K,Y,X,U,E,new S0);if(Z)N.uv1=oJ.getInterpolatedAttribute(Z,Y,X,U,E,new S0);if(H){if(N.normal=oJ.getInterpolatedAttribute(H,Y,X,U,E,new f),N.normal.dot(W.direction)>0)N.normal.multiplyScalar(-1)}let G={a:Y,b:X,c:U,normal:new f,materialIndex:0};oJ.getNormal(y7,f7,h7,G.normal),N.face=G,N.barycoord=E}return N}class iQ extends wJ{constructor(J=null,Q=1,$=1,W,K,Z,H,Y,X=1003,U=1003,N,E){super(null,Z,H,Y,X,U,W,K,N,E);this.isDataTexture=!0,this.image={data:J,width:Q,height:$},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}var s9=new N7,LH=new S0(0.5,0.5),g7=new f;class K6{constructor(J=new iJ,Q=new iJ,$=new iJ,W=new iJ,K=new iJ,Z=new iJ){this.planes=[J,Q,$,W,K,Z]}set(J,Q,$,W,K,Z){let H=this.planes;return H[0].copy(J),H[1].copy(Q),H[2].copy($),H[3].copy(W),H[4].copy(K),H[5].copy(Z),this}copy(J){let Q=this.planes;for(let $=0;$<6;$++)Q[$].copy(J.planes[$]);return this}setFromProjectionMatrix(J,Q=2000,$=!1){let W=this.planes,K=J.elements,Z=K[0],H=K[1],Y=K[2],X=K[3],U=K[4],N=K[5],E=K[6],G=K[7],F=K[8],L=K[9],I=K[10],D=K[11],q=K[12],A=K[13],y=K[14],V=K[15];if(W[0].setComponents(X-Z,G-U,D-F,V-q).normalize(),W[1].setComponents(X+Z,G+U,D+F,V+q).normalize(),W[2].setComponents(X+H,G+N,D+L,V+A).normalize(),W[3].setComponents(X-H,G-N,D-L,V-A).normalize(),$)W[4].setComponents(Y,E,I,y).normalize(),W[5].setComponents(X-Y,G-E,D-I,V-y).normalize();else if(W[4].setComponents(X-Y,G-E,D-I,V-y).normalize(),Q===2000)W[5].setComponents(X+Y,G+E,D+I,V+y).normalize();else if(Q===2001)W[5].setComponents(Y,E,I,y).normalize();else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+Q);return this}intersectsObject(J){if(J.boundingSphere!==void 0){if(J.boundingSphere===null)J.computeBoundingSphere();s9.copy(J.boundingSphere).applyMatrix4(J.matrixWorld)}else{let Q=J.geometry;if(Q.boundingSphere===null)Q.computeBoundingSphere();s9.copy(Q.boundingSphere).applyMatrix4(J.matrixWorld)}return this.intersectsSphere(s9)}intersectsSprite(J){s9.center.set(0,0,0);let Q=LH.distanceTo(J.center);return s9.radius=0.7071067811865476+Q,s9.applyMatrix4(J.matrixWorld),this.intersectsSphere(s9)}intersectsSphere(J){let Q=this.planes,$=J.center,W=-J.radius;for(let K=0;K<6;K++)if(Q[K].distanceToPoint($)<W)return!1;return!0}intersectsBox(J){let Q=this.planes;for(let $=0;$<6;$++){let W=Q[$];if(g7.x=W.normal.x>0?J.max.x:J.min.x,g7.y=W.normal.y>0?J.max.y:J.min.y,g7.z=W.normal.z>0?J.max.z:J.min.z,W.distanceToPoint(g7)<0)return!1}return!0}containsPoint(J){let Q=this.planes;for(let $=0;$<6;$++)if(Q[$].distanceToPoint(J)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Z6 extends wJ{constructor(J=[],Q=301,$,W,K,Z,H,Y,X,U){super(J,Q,$,W,K,Z,H,Y,X,U);this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(J){this.image=J}}class $8 extends wJ{constructor(J,Q,$=1014,W,K,Z,H=1003,Y=1003,X,U=1026,N=1){if(U!==1026&&U!==1027)throw Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let E={width:J,height:Q,depth:N};super(E,W,K,Z,H,Y,U,$,X);this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(J){return super.copy(J),this.source=new X7(Object.assign({},J.image)),this.compareFunction=J.compareFunction,this}toJSON(J){let Q=super.toJSON(J);return Q.compareFunction=this.compareFunction,Q}}class oQ extends $8{constructor(J,Q=1014,$=301,W,K,Z=1003,H=1003,Y,X=1026){let U={width:J,height:J,depth:1},N=[U,U,U,U,U,U];super(J,J,Q,$,W,K,Z,H,Y,X);this.image=N,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(J){this.image=J}}class H6 extends wJ{constructor(J=null){super();this.sourceTexture=J,this.isExternalTexture=!0}copy(J){return super.copy(J),this.sourceTexture=J.sourceTexture,this}}class m9 extends gJ{constructor(J=1,Q=1,$=1,W=1,K=1,Z=1){super();this.type="BoxGeometry",this.parameters={width:J,height:Q,depth:$,widthSegments:W,heightSegments:K,depthSegments:Z};let H=this;W=Math.floor(W),K=Math.floor(K),Z=Math.floor(Z);let Y=[],X=[],U=[],N=[],E=0,G=0;F("z","y","x",-1,-1,$,Q,J,Z,K,0),F("z","y","x",1,-1,$,Q,-J,Z,K,1),F("x","z","y",1,1,J,$,Q,W,Z,2),F("x","z","y",1,-1,J,$,-Q,W,Z,3),F("x","y","z",1,-1,J,Q,$,W,K,4),F("x","y","z",-1,-1,J,Q,-$,W,K,5),this.setIndex(Y),this.setAttribute("position",new IJ(X,3)),this.setAttribute("normal",new IJ(U,3)),this.setAttribute("uv",new IJ(N,2));function F(L,I,D,q,A,y,V,z,C,P,M){let B=y/C,l=V/P,h=y/2,v=V/2,r=z/2,S=C+1,d=P+1,o=0,m=0,Q0=new f;for(let c=0;c<d;c++){let a=c*l-v;for(let J0=0;J0<S;J0++){let w0=J0*B-h;Q0[L]=w0*q,Q0[I]=a*A,Q0[D]=r,X.push(Q0.x,Q0.y,Q0.z),Q0[L]=0,Q0[I]=0,Q0[D]=z>0?1:-1,U.push(Q0.x,Q0.y,Q0.z),N.push(J0/C),N.push(1-c/P),o+=1}}for(let c=0;c<P;c++)for(let a=0;a<C;a++){let J0=E+a+S*c,w0=E+a+S*(c+1),z0=E+(a+1)+S*(c+1),QJ=E+(a+1)+S*c;Y.push(J0,w0,QJ),Y.push(w0,z0,QJ),m+=6}H.addGroup(G,m,M),G+=m,E+=o}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new m9(J.width,J.height,J.depth,J.widthSegments,J.heightSegments,J.depthSegments)}}class W8 extends gJ{constructor(J=1,Q=1,$=1,W=1){super();this.type="PlaneGeometry",this.parameters={width:J,height:Q,widthSegments:$,heightSegments:W};let K=J/2,Z=Q/2,H=Math.floor($),Y=Math.floor(W),X=H+1,U=Y+1,N=J/H,E=Q/Y,G=[],F=[],L=[],I=[];for(let D=0;D<U;D++){let q=D*E-Z;for(let A=0;A<X;A++){let y=A*N-K;F.push(y,-q,0),L.push(0,0,1),I.push(A/H),I.push(1-D/Y)}}for(let D=0;D<Y;D++)for(let q=0;q<H;q++){let A=q+X*D,y=q+X*(D+1),V=q+1+X*(D+1),z=q+1+X*D;G.push(A,y,z),G.push(y,V,z)}this.setIndex(G),this.setAttribute("position",new IJ(F,3)),this.setAttribute("normal",new IJ(L,3)),this.setAttribute("uv",new IJ(I,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new W8(J.width,J.height,J.widthSegments,J.heightSegments)}}class q7 extends gJ{constructor(J=1,Q=32,$=16,W=0,K=Math.PI*2,Z=0,H=Math.PI){super();this.type="SphereGeometry",this.parameters={radius:J,widthSegments:Q,heightSegments:$,phiStart:W,phiLength:K,thetaStart:Z,thetaLength:H},Q=Math.max(3,Math.floor(Q)),$=Math.max(2,Math.floor($));let Y=Math.min(Z+H,Math.PI),X=0,U=[],N=new f,E=new f,G=[],F=[],L=[],I=[];for(let D=0;D<=$;D++){let q=[],A=D/$,y=Z+A*H,V=J*Math.cos(y),z=Math.sqrt(J*J-V*V),C=0;if(D===0&&Z===0)C=0.5/Q;else if(D===$&&Y===Math.PI)C=-0.5/Q;for(let P=0;P<=Q;P++){let M=P/Q,B=W+M*K;N.x=-z*Math.cos(B),N.y=V,N.z=z*Math.sin(B),F.push(N.x,N.y,N.z),E.copy(N).normalize(),L.push(E.x,E.y,E.z),I.push(M+C,1-A),q.push(X++)}U.push(q)}for(let D=0;D<$;D++)for(let q=0;q<Q;q++){let A=U[D][q+1],y=U[D][q],V=U[D+1][q],z=U[D+1][q+1];if(D!==0||Z>0)G.push(A,y,z);if(D!==$-1||Y<Math.PI)G.push(y,V,z)}this.setIndex(G),this.setAttribute("position",new IJ(F,3)),this.setAttribute("normal",new IJ(L,3)),this.setAttribute("uv",new IJ(I,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new q7(J.radius,J.widthSegments,J.heightSegments,J.phiStart,J.phiLength,J.thetaStart,J.thetaLength)}}function K8(J){let Q={};for(let $ in J){Q[$]={};for(let W in J[$]){let K=J[$][W];if(qW(K))if(K.isRenderTargetTexture)P0("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),Q[$][W]=null;else Q[$][W]=K.clone();else if(Array.isArray(K))if(qW(K[0])){let Z=[];for(let H=0,Y=K.length;H<Y;H++)Z[H]=K[H].clone();Q[$][W]=Z}else Q[$][W]=K.slice();else Q[$][W]=K}}return Q}function TJ(J){let Q={};for(let $=0;$<J.length;$++){let W=K8(J[$]);for(let K in W)Q[K]=W[K]}return Q}function qW(J){return J&&(J.isColor||J.isMatrix3||J.isMatrix4||J.isVector2||J.isVector3||J.isVector4||J.isTexture||J.isQuaternion)}function kH(J){let Q=[];for(let $=0;$<J.length;$++)Q.push(J[$].clone());return Q}function aQ(J){let Q=J.getRenderTarget();if(Q===null)return J.outputColorSpace;if(Q.isXRRenderTarget===!0)return Q.texture.colorSpace;return m0.workingColorSpace}var VK={clone:K8,merge:TJ},VH=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,BH=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class SJ extends g8{constructor(J){super();if(this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=VH,this.fragmentShader=BH,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,J!==void 0)this.setValues(J)}copy(J){return super.copy(J),this.fragmentShader=J.fragmentShader,this.vertexShader=J.vertexShader,this.uniforms=K8(J.uniforms),this.uniformsGroups=kH(J.uniformsGroups),this.defines=Object.assign({},J.defines),this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.fog=J.fog,this.lights=J.lights,this.clipping=J.clipping,this.extensions=Object.assign({},J.extensions),this.glslVersion=J.glslVersion,this.defaultAttributeValues=Object.assign({},J.defaultAttributeValues),this.index0AttributeName=J.index0AttributeName,this.uniformsNeedUpdate=J.uniformsNeedUpdate,this}toJSON(J){let Q=super.toJSON(J);Q.glslVersion=this.glslVersion,Q.uniforms={};for(let W in this.uniforms){let Z=this.uniforms[W].value;if(Z&&Z.isTexture)Q.uniforms[W]={type:"t",value:Z.toJSON(J).uuid};else if(Z&&Z.isColor)Q.uniforms[W]={type:"c",value:Z.getHex()};else if(Z&&Z.isVector2)Q.uniforms[W]={type:"v2",value:Z.toArray()};else if(Z&&Z.isVector3)Q.uniforms[W]={type:"v3",value:Z.toArray()};else if(Z&&Z.isVector4)Q.uniforms[W]={type:"v4",value:Z.toArray()};else if(Z&&Z.isMatrix3)Q.uniforms[W]={type:"m3",value:Z.toArray()};else if(Z&&Z.isMatrix4)Q.uniforms[W]={type:"m4",value:Z.toArray()};else Q.uniforms[W]={value:Z}}if(Object.keys(this.defines).length>0)Q.defines=this.defines;Q.vertexShader=this.vertexShader,Q.fragmentShader=this.fragmentShader,Q.lights=this.lights,Q.clipping=this.clipping;let $={};for(let W in this.extensions)if(this.extensions[W]===!0)$[W]=!0;if(Object.keys($).length>0)Q.extensions=$;return Q}fromJSON(J,Q){if(super.fromJSON(J,Q),J.uniforms!==void 0)for(let $ in J.uniforms){let W=J.uniforms[$];switch(this.uniforms[$]={},W.type){case"t":this.uniforms[$].value=Q[W.value]||null;break;case"c":this.uniforms[$].value=new g0().setHex(W.value);break;case"v2":this.uniforms[$].value=new S0().fromArray(W.value);break;case"v3":this.uniforms[$].value=new f().fromArray(W.value);break;case"v4":this.uniforms[$].value=new UJ().fromArray(W.value);break;case"m3":this.uniforms[$].value=new j0().fromArray(W.value);break;case"m4":this.uniforms[$].value=new KJ().fromArray(W.value);break;default:this.uniforms[$].value=W.value}}if(J.defines!==void 0)this.defines=J.defines;if(J.vertexShader!==void 0)this.vertexShader=J.vertexShader;if(J.fragmentShader!==void 0)this.fragmentShader=J.fragmentShader;if(J.glslVersion!==void 0)this.glslVersion=J.glslVersion;if(J.extensions!==void 0)for(let $ in J.extensions)this.extensions[$]=J.extensions[$];if(J.lights!==void 0)this.lights=J.lights;if(J.clipping!==void 0)this.clipping=J.clipping;return this}}class rQ extends SJ{constructor(J){super(J);this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class tQ extends g8{constructor(J){super();this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(J)}copy(J){return super.copy(J),this.depthPacking=J.depthPacking,this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this}}class eQ extends g8{constructor(J){super();this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(J)}copy(J){return super.copy(J),this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this}}function A8(J,Q){if(!J||J.constructor===Q)return J;if(typeof Q.BYTES_PER_ELEMENT==="number")return new Q(J);return Array.prototype.slice.call(J)}function m6(J){return J!==void 0&&J.inTangents!==void 0&&J.outTangents!==void 0}class Z8{constructor(J,Q,$,W){this.parameterPositions=J,this._cachedIndex=0,this.resultBuffer=W!==void 0?W:new Q.constructor($),this.sampleValues=Q,this.valueSize=$,this.settings=null,this.DefaultSettings_={}}evaluate(J){let Q=this.parameterPositions,$=this._cachedIndex,W=Q[$],K=Q[$-1];$:{J:{let Z;Q:{W:if(!(J<W)){for(let H=$+2;;){if(W===void 0){if(J<K)break W;return $=Q.length,this._cachedIndex=$,this.copySampleValue_($-1)}if($===H)break;if(K=W,W=Q[++$],J<W)break J}Z=Q.length;break Q}if(!(J>=K)){let H=Q[1];if(J<H)$=2,K=H;for(let Y=$-2;;){if(K===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if($===Y)break;if(W=K,K=Q[--$-1],J>=K)break J}Z=$,$=0;break Q}break $}while($<Z){let H=$+Z>>>1;if(J<Q[H])Z=H;else $=H+1}if(W=Q[$],K=Q[$-1],K===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(W===void 0)return $=Q.length,this._cachedIndex=$,this.copySampleValue_($-1)}this._cachedIndex=$,this.intervalChanged_($,K,W)}return this.interpolate_($,K,J,W)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(J){let Q=this.resultBuffer,$=this.sampleValues,W=this.valueSize,K=J*W;for(let Z=0;Z!==W;++Z)Q[Z]=$[K+Z];return Q}interpolate_(){throw Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}}class J$ extends Z8{constructor(J,Q,$,W){super(J,Q,$,W);this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:2400,endingEnd:2400}}intervalChanged_(J,Q,$){let W=this.parameterPositions,K=J-2,Z=J+1,H=W[K],Y=W[Z];if(H===void 0)switch(this.getSettings_().endingStart){case 2401:K=J,H=2*Q-$;break;case 2402:K=W.length-2,H=Q+W[K]-W[K+1];break;default:K=J,H=$}if(Y===void 0)switch(this.getSettings_().endingEnd){case 2401:Z=J,Y=2*$-Q;break;case 2402:Z=1,Y=$+W[1]-W[0];break;default:Z=J-1,Y=Q}let X=($-Q)*0.5,U=this.valueSize;this._weightPrev=X/(Q-H),this._weightNext=X/(Y-$),this._offsetPrev=K*U,this._offsetNext=Z*U}interpolate_(J,Q,$,W){let K=this.resultBuffer,Z=this.sampleValues,H=this.valueSize,Y=J*H,X=Y-H,U=this._offsetPrev,N=this._offsetNext,E=this._weightPrev,G=this._weightNext,F=($-Q)/(W-Q),L=F*F,I=L*F,D=-E*I+2*E*L-E*F,q=(1+E)*I+(-1.5-2*E)*L+(-0.5+E)*F+1,A=(-1-G)*I+(1.5+G)*L+0.5*F,y=G*I-G*L;for(let V=0;V!==H;++V)K[V]=D*Z[U+V]+q*Z[X+V]+A*Z[Y+V]+y*Z[N+V];return K}}class Q$ extends Z8{constructor(J,Q,$,W){super(J,Q,$,W)}interpolate_(J,Q,$,W){let K=this.resultBuffer,Z=this.sampleValues,H=this.valueSize,Y=J*H,X=Y-H,U=($-Q)/(W-Q),N=1-U;for(let E=0;E!==H;++E)K[E]=Z[X+E]*N+Z[Y+E]*U;return K}}class $$ extends Z8{constructor(J,Q,$,W){super(J,Q,$,W)}interpolate_(J){return this.copySampleValue_(J-1)}}class W$ extends Z8{interpolate_(J,Q,$,W){let K=this.resultBuffer,Z=this.sampleValues,H=this.valueSize,Y=J*H,X=Y-H,U=this.inTangents,N=this.outTangents;if(!U||!N){let F=($-Q)/(W-Q),L=1-F;for(let I=0;I!==H;++I)K[I]=Z[X+I]*L+Z[Y+I]*F;return K}let E=H*2,G=J-1;for(let F=0;F!==H;++F){let L=Z[X+F],I=Z[Y+F],D=G*E+F*2,q=N[D],A=N[D+1],y=J*E+F*2,V=U[y],z=U[y+1],C=zH($,Q,q,V,W);K[F]=BK(C,L,A,z,I)}return K}}function BK(J,Q,$,W,K){let Z=1-J;return Z*Z*Z*Q+3*Z*Z*J*$+3*Z*J*J*W+J*J*J*K}function IH(J,Q,$,W,K){let Z=1-J;return 3*Z*Z*($-Q)+6*Z*J*(W-$)+3*J*J*(K-W)}function zH(J,Q,$,W,K){let Z=(J-Q)/(K-Q);for(let H=0;H<8;H++){let Y=BK(Z,Q,$,W,K)-J;if(Math.abs(Y)<0.0000000001)break;let X=IH(Z,Q,$,W,K);if(Math.abs(X)<0.0000000001)break;Z=Math.max(0,Math.min(1,Z-Y/X))}return Z}class tJ{constructor(J,Q,$,W){if(J===void 0)throw Error("THREE.KeyframeTrack: track name is undefined");if(Q===void 0||Q.length===0)throw Error("THREE.KeyframeTrack: no keyframes in track named "+J);this.name=J,this.times=A8(Q,this.TimeBufferType),this.values=A8($,this.ValueBufferType),this.setInterpolation(W||this.DefaultInterpolation)}static toJSON(J){let Q=J.constructor,$;if(Q.toJSON!==this.toJSON)$=Q.toJSON(J);else{$={name:J.name,times:A8(J.times,Array),values:A8(J.values,Array)};let W=J.getInterpolation();if(W!==J.DefaultInterpolation)$.interpolation=W;if(m6(J.settings))$.settings={inTangents:A8(J.settings.inTangents,Array),outTangents:A8(J.settings.outTangents,Array)}}return $.type=J.ValueTypeName,$}InterpolantFactoryMethodDiscrete(J){return new $$(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodLinear(J){return new Q$(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodSmooth(J){return new J$(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodBezier(J){let Q=new W$(this.times,this.values,this.getValueSize(),J);if(this.settings)Q.inTangents=this.settings.inTangents,Q.outTangents=this.settings.outTangents;return Q}setInterpolation(J){let Q;switch(J){case 2300:Q=this.InterpolantFactoryMethodDiscrete;break;case 2301:Q=this.InterpolantFactoryMethodLinear;break;case 2302:Q=this.InterpolantFactoryMethodSmooth;break;case 2303:Q=this.InterpolantFactoryMethodBezier;break}if(Q===void 0){let $="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(J!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error($);return P0("KeyframeTrack:",$),this}return this.createInterpolant=Q,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302;case this.InterpolantFactoryMethodBezier:return 2303}}getValueSize(){return this.values.length/this.times.length}shift(J){if(J!==0){let Q=this.times;for(let $=0,W=Q.length;$!==W;++$)Q[$]+=J}return this}scale(J){if(J!==1){let Q=this.times;for(let $=0,W=Q.length;$!==W;++$)Q[$]*=J;if(m6(this.settings))EW(this.settings.inTangents,J),EW(this.settings.outTangents,J)}return this}trim(J,Q){let $=this.times,W=$.length,K=0,Z=W-1;while(K!==W&&$[K]<J)++K;while(Z!==-1&&$[Z]>Q)--Z;if(++Z,K!==0||Z!==W){if(K>=Z)Z=Math.max(Z,1),K=Z-1;let H=this.getValueSize();this.times=$.slice(K,Z),this.values=this.values.slice(K*H,Z*H)}return this}validate(){let J=!0,Q=this.getValueSize();if(Q-Math.floor(Q)!==0)T0("KeyframeTrack: Invalid value size in track.",this),J=!1;let $=this.times,W=this.values,K=$.length;if(K===0)T0("KeyframeTrack: Track is empty.",this),J=!1;let Z=null;for(let H=0;H!==K;H++){let Y=$[H];if(typeof Y==="number"&&isNaN(Y)){T0("KeyframeTrack: Time is not a valid number.",this,H,Y),J=!1;break}if(Z!==null&&Z>Y){T0("KeyframeTrack: Out of order keys.",this,H,Y,Z),J=!1;break}Z=Y}if(W!==void 0){if(gZ(W))for(let H=0,Y=W.length;H!==Y;++H){let X=W[H];if(isNaN(X)){T0("KeyframeTrack: Value is not a valid number.",this,H,X),J=!1;break}}}return J}optimize(){let J=this.times.slice(),Q=this.values.slice(),$=this.getValueSize(),W=this.getInterpolation()===2302,K=J.length-1,Z=1;for(let H=1;H<K;++H){let Y=!1,X=J[H],U=J[H+1];if(X!==U&&(H!==1||X!==J[0]))if(!W){let N=H*$,E=N-$,G=N+$;for(let F=0;F!==$;++F){let L=Q[N+F];if(L!==Q[E+F]||L!==Q[G+F]){Y=!0;break}}}else Y=!0;if(Y){if(H!==Z){J[Z]=J[H];let N=H*$,E=Z*$;for(let G=0;G!==$;++G)Q[E+G]=Q[N+G]}++Z}}if(K>0){J[Z]=J[K];for(let H=K*$,Y=Z*$,X=0;X!==$;++X)Q[Y+X]=Q[H+X];++Z}if(Z!==J.length)this.times=J.slice(0,Z),this.values=Q.slice(0,Z*$);else this.times=J,this.values=Q;return this}clone(){let J=this.times.slice(),Q=this.values.slice(),W=new this.constructor(this.name,J,Q);if(W.createInterpolant=this.createInterpolant,m6(this.settings))W.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()};return W}}function EW(J,Q){for(let $=0,W=J.length;$!==W;$+=2)J[$]*=Q}tJ.prototype.ValueTypeName="";tJ.prototype.TimeBufferType=Float32Array;tJ.prototype.ValueBufferType=Float32Array;tJ.prototype.DefaultInterpolation=2301;class H8 extends tJ{constructor(J,Q,$){super(J,Q,$)}}H8.prototype.ValueTypeName="bool";H8.prototype.ValueBufferType=Array;H8.prototype.DefaultInterpolation=2300;H8.prototype.InterpolantFactoryMethodLinear=void 0;H8.prototype.InterpolantFactoryMethodSmooth=void 0;class K$ extends tJ{constructor(J,Q,$,W){super(J,Q,$,W)}}K$.prototype.ValueTypeName="color";class Z$ extends tJ{constructor(J,Q,$,W){super(J,Q,$,W)}}Z$.prototype.ValueTypeName="number";class H$ extends Z8{constructor(J,Q,$,W){super(J,Q,$,W)}interpolate_(J,Q,$,W){let K=this.resultBuffer,Z=this.sampleValues,H=this.valueSize,Y=($-Q)/(W-Q),X=J*H;for(let U=X+H;X!==U;X+=4)rJ.slerpFlat(K,0,Z,X-H,Z,X,Y);return K}}class Y6 extends tJ{constructor(J,Q,$,W){super(J,Q,$,W)}InterpolantFactoryMethodLinear(J){return new H$(this.times,this.values,this.getValueSize(),J)}}Y6.prototype.ValueTypeName="quaternion";Y6.prototype.InterpolantFactoryMethodSmooth=void 0;class Y8 extends tJ{constructor(J,Q,$){super(J,Q,$)}}Y8.prototype.ValueTypeName="string";Y8.prototype.ValueBufferType=Array;Y8.prototype.DefaultInterpolation=2300;Y8.prototype.InterpolantFactoryMethodLinear=void 0;Y8.prototype.InterpolantFactoryMethodSmooth=void 0;class Y$ extends tJ{constructor(J,Q,$,W){super(J,Q,$,W)}}Y$.prototype.ValueTypeName="vector";class X${constructor(J,Q,$){let W=this,K=!1,Z=0,H=0,Y=void 0,X=[];this.onStart=void 0,this.onLoad=J,this.onProgress=Q,this.onError=$,this._abortController=null,this.itemStart=function(U){if(H++,K===!1){if(W.onStart!==void 0)W.onStart(U,Z,H)}K=!0},this.itemEnd=function(U){if(Z++,W.onProgress!==void 0)W.onProgress(U,Z,H);if(Z===H){if(K=!1,W.onLoad!==void 0)W.onLoad()}},this.itemError=function(U){if(W.onError!==void 0)W.onError(U)},this.resolveURL=function(U){if(U=U.normalize("NFC"),Y)return Y(U);return U},this.setURLModifier=function(U){return Y=U,this},this.addHandler=function(U,N){return X.push(U,N),this},this.removeHandler=function(U){let N=X.indexOf(U);if(N!==-1)X.splice(N,2);return this},this.getHandler=function(U){for(let N=0,E=X.length;N<E;N+=2){let G=X[N],F=X[N+1];if(G.global)G.lastIndex=0;if(G.test(U))return F}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){if(!this._abortController)this._abortController=new AbortController;return this._abortController}}var IK=new X$;class U${constructor(J){if(this.manager=J!==void 0?J:IK,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(J,Q){let $=this;return new Promise(function(W,K){$.load(J,W,Q,K)})}parse(){}setCrossOrigin(J){return this.crossOrigin=J,this}setWithCredentials(J){return this.withCredentials=J,this}setPath(J){return this.path=J,this}setResourcePath(J){return this.resourcePath=J,this}setRequestHeader(J){return this.requestHeader=J,this}abort(){return this}}U$.DEFAULT_MATERIAL_NAME="__DEFAULT";var p7=new f,m7=new rJ,N9=new f;class X6 extends _J{constructor(){super();this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new KJ,this.projectionMatrix=new KJ,this.projectionMatrixInverse=new KJ,this.coordinateSystem=2000,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(J,Q){return super.copy(J,Q),this.matrixWorldInverse.copy(J.matrixWorldInverse),this.projectionMatrix.copy(J.projectionMatrix),this.projectionMatrixInverse.copy(J.projectionMatrixInverse),this.coordinateSystem=J.coordinateSystem,this}getWorldDirection(J){return super.getWorldDirection(J).negate()}updateMatrixWorld(J){if(super.updateMatrixWorld(J),this.matrixWorld.decompose(p7,m7,N9),N9.x===1&&N9.y===1&&N9.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(p7,m7,N9.set(1,1,1)).invert()}updateWorldMatrix(J,Q,$=!1){if(super.updateWorldMatrix(J,Q,$),this.matrixWorld.decompose(p7,m7,N9),N9.x===1&&N9.y===1&&N9.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(p7,m7,N9.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}var v9=new f,FW=new S0,DW=new S0;class uJ extends X6{constructor(J=50,Q=1,$=0.1,W=2000){super();this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=J,this.zoom=1,this.near=$,this.far=W,this.focus=10,this.aspect=Q,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(J,Q){return super.copy(J,Q),this.fov=J.fov,this.zoom=J.zoom,this.near=J.near,this.far=J.far,this.focus=J.focus,this.aspect=J.aspect,this.view=J.view===null?null:Object.assign({},J.view),this.filmGauge=J.filmGauge,this.filmOffset=J.filmOffset,this}setFocalLength(J){let Q=0.5*this.getFilmHeight()/J;this.fov=j8*2*Math.atan(Q),this.updateProjectionMatrix()}getFocalLength(){let J=Math.tan(J7*0.5*this.fov);return 0.5*this.getFilmHeight()/J}getEffectiveFOV(){return j8*2*Math.atan(Math.tan(J7*0.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(J,Q,$){v9.set(-1,-1,0.5).applyMatrix4(this.projectionMatrixInverse),Q.set(v9.x,v9.y).multiplyScalar(-J/v9.z),v9.set(1,1,0.5).applyMatrix4(this.projectionMatrixInverse),$.set(v9.x,v9.y).multiplyScalar(-J/v9.z)}getViewSize(J,Q){return this.getViewBounds(J,FW,DW),Q.subVectors(DW,FW)}setViewOffset(J,Q,$,W,K,Z){if(this.aspect=J/Q,this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=Q,this.view.offsetX=$,this.view.offsetY=W,this.view.width=K,this.view.height=Z,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=this.near,Q=J*Math.tan(J7*0.5*this.fov)/this.zoom,$=2*Q,W=this.aspect*$,K=-0.5*W,Z=this.view;if(this.view!==null&&this.view.enabled){let{fullWidth:Y,fullHeight:X}=Z;K+=Z.offsetX*W/Y,Q-=Z.offsetY*$/X,W*=Z.width/Y,$*=Z.height/X}let H=this.filmOffset;if(H!==0)K+=J*H/this.getFilmWidth();this.projectionMatrix.makePerspective(K,K+W,Q,Q-$,J,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let Q=super.toJSON(J);if(Q.object.fov=this.fov,Q.object.zoom=this.zoom,Q.object.near=this.near,Q.object.far=this.far,Q.object.focus=this.focus,Q.object.aspect=this.aspect,this.view!==null)Q.object.view=Object.assign({},this.view);return Q.object.filmGauge=this.filmGauge,Q.object.filmOffset=this.filmOffset,Q}}class m8 extends X6{constructor(J=-1,Q=1,$=1,W=-1,K=0.1,Z=2000){super();this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=J,this.right=Q,this.top=$,this.bottom=W,this.near=K,this.far=Z,this.updateProjectionMatrix()}copy(J,Q){return super.copy(J,Q),this.left=J.left,this.right=J.right,this.top=J.top,this.bottom=J.bottom,this.near=J.near,this.far=J.far,this.zoom=J.zoom,this.view=J.view===null?null:Object.assign({},J.view),this}setViewOffset(J,Q,$,W,K,Z){if(this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=Q,this.view.offsetX=$,this.view.offsetY=W,this.view.width=K,this.view.height=Z,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=(this.right-this.left)/(2*this.zoom),Q=(this.top-this.bottom)/(2*this.zoom),$=(this.right+this.left)/2,W=(this.top+this.bottom)/2,K=$-J,Z=$+J,H=W+Q,Y=W-Q;if(this.view!==null&&this.view.enabled){let X=(this.right-this.left)/this.view.fullWidth/this.zoom,U=(this.top-this.bottom)/this.view.fullHeight/this.zoom;K+=X*this.view.offsetX,Z=K+X*this.view.width,H-=U*this.view.offsetY,Y=H-U*this.view.height}this.projectionMatrix.makeOrthographic(K,Z,H,Y,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let Q=super.toJSON(J);if(Q.object.zoom=this.zoom,Q.object.left=this.left,Q.object.right=this.right,Q.object.top=this.top,Q.object.bottom=this.bottom,Q.object.near=this.near,Q.object.far=this.far,this.view!==null)Q.object.view=Object.assign({},this.view);return Q}}var C8=-90,P8=1;class G$ extends _J{constructor(J,Q,$){super();this.type="CubeCamera",this.renderTarget=$,this.coordinateSystem=null,this.activeMipmapLevel=0;let W=new uJ(C8,P8,J,Q);W.layers=this.layers,this.add(W);let K=new uJ(C8,P8,J,Q);K.layers=this.layers,this.add(K);let Z=new uJ(C8,P8,J,Q);Z.layers=this.layers,this.add(Z);let H=new uJ(C8,P8,J,Q);H.layers=this.layers,this.add(H);let Y=new uJ(C8,P8,J,Q);Y.layers=this.layers,this.add(Y);let X=new uJ(C8,P8,J,Q);X.layers=this.layers,this.add(X)}updateCoordinateSystem(){let J=this.coordinateSystem,Q=this.children.concat(),[$,W,K,Z,H,Y]=Q;for(let X of Q)this.remove(X);if(J===2000)$.up.set(0,1,0),$.lookAt(1,0,0),W.up.set(0,1,0),W.lookAt(-1,0,0),K.up.set(0,0,-1),K.lookAt(0,1,0),Z.up.set(0,0,1),Z.lookAt(0,-1,0),H.up.set(0,1,0),H.lookAt(0,0,1),Y.up.set(0,1,0),Y.lookAt(0,0,-1);else if(J===2001)$.up.set(0,-1,0),$.lookAt(-1,0,0),W.up.set(0,-1,0),W.lookAt(1,0,0),K.up.set(0,0,1),K.lookAt(0,1,0),Z.up.set(0,0,-1),Z.lookAt(0,-1,0),H.up.set(0,-1,0),H.lookAt(0,0,1),Y.up.set(0,-1,0),Y.lookAt(0,0,-1);else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+J);for(let X of Q)this.add(X),X.updateMatrixWorld()}update(J,Q){if(this.parent===null)this.updateMatrixWorld();let{renderTarget:$,activeMipmapLevel:W}=this;if(this.coordinateSystem!==J.coordinateSystem)this.coordinateSystem=J.coordinateSystem,this.updateCoordinateSystem();let[K,Z,H,Y,X,U]=this.children,N=J.getRenderTarget(),E=J.getActiveCubeFace(),G=J.getActiveMipmapLevel(),F=J.xr.enabled;J.xr.enabled=!1;let L=$.texture.generateMipmaps;$.texture.generateMipmaps=!1;let I=!1;if(J.isWebGLRenderer===!0)I=J.state.buffers.depth.getReversed();else I=J.reversedDepthBuffer;if(J.setRenderTarget($,0,W),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,K),J.setRenderTarget($,1,W),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,Z),J.setRenderTarget($,2,W),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,H),J.setRenderTarget($,3,W),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,Y),J.setRenderTarget($,4,W),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,X),$.texture.generateMipmaps=L,J.setRenderTarget($,5,W),I&&J.autoClear===!1)J.clearDepth();J.render(Q,U),J.setRenderTarget(N,E,G),J.xr.enabled=F,$.texture.needsPMREMUpdate=!0}}class N$ extends uJ{constructor(J=[]){super();this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=J}}var q$="\\[\\]\\.:\\/",AH=new RegExp("["+q$+"]","g"),E$="[^"+q$+"]",CH="[^"+q$.replace("\\.","")+"]",PH=/((?:WC+[\/:])*)/.source.replace("WC",E$),wH=/(WCOD+)?/.source.replace("WCOD",CH),_H=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",E$),TH=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",E$),SH=new RegExp("^"+PH+wH+_H+TH+"$"),jH=["material","materials","bones","map"];class zK{constructor(J,Q,$){let W=$||a0.parseTrackName(Q);this._targetGroup=J,this._bindings=J.subscribe_(Q,W)}getValue(J,Q){this.bind();let $=this._targetGroup.nCachedObjects_,W=this._bindings[$];if(W!==void 0)W.getValue(J,Q)}setValue(J,Q){let $=this._bindings;for(let W=this._targetGroup.nCachedObjects_,K=$.length;W!==K;++W)$[W].setValue(J,Q)}bind(){let J=this._bindings;for(let Q=this._targetGroup.nCachedObjects_,$=J.length;Q!==$;++Q)J[Q].bind()}unbind(){let J=this._bindings;for(let Q=this._targetGroup.nCachedObjects_,$=J.length;Q!==$;++Q)J[Q].unbind()}}class a0{constructor(J,Q,$){this.path=Q,this.parsedPath=$||a0.parseTrackName(Q),this.node=a0.findNode(J,this.parsedPath.nodeName),this.rootNode=J,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(J,Q,$){if(!(J&&J.isAnimationObjectGroup))return new a0(J,Q,$);else return new a0.Composite(J,Q,$)}static sanitizeNodeName(J){return J.replace(/\s/g,"_").replace(AH,"")}static parseTrackName(J){let Q=SH.exec(J);if(Q===null)throw Error("THREE.PropertyBinding: Cannot parse trackName: "+J);let $={nodeName:Q[2],objectName:Q[3],objectIndex:Q[4],propertyName:Q[5],propertyIndex:Q[6]},W=$.nodeName&&$.nodeName.lastIndexOf(".");if(W!==void 0&&W!==-1){let K=$.nodeName.substring(W+1);if(jH.indexOf(K)!==-1)$.nodeName=$.nodeName.substring(0,W),$.objectName=K}if($.propertyName===null||$.propertyName.length===0)throw Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+J);return $}static findNode(J,Q){if(Q===void 0||Q===""||Q==="."||Q===-1||Q===J.name||Q===J.uuid)return J;if(J.skeleton){let $=J.skeleton.getBoneByName(Q);if($!==void 0)return $}if(J.children){let $=function(K){for(let Z=0;Z<K.length;Z++){let H=K[Z];if(H.name===Q||H.uuid===Q)return H;let Y=$(H.children);if(Y)return Y}return null},W=$(J.children);if(W)return W}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(J,Q){J[Q]=this.targetObject[this.propertyName]}_getValue_array(J,Q){let $=this.resolvedProperty;for(let W=0,K=$.length;W!==K;++W)J[Q++]=$[W]}_getValue_arrayElement(J,Q){J[Q]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(J,Q){this.resolvedProperty.toArray(J,Q)}_setValue_direct(J,Q){this.targetObject[this.propertyName]=J[Q]}_setValue_direct_setNeedsUpdate(J,Q){this.targetObject[this.propertyName]=J[Q],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(J,Q){this.targetObject[this.propertyName]=J[Q],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(J,Q){let $=this.resolvedProperty;for(let W=0,K=$.length;W!==K;++W)$[W]=J[Q++]}_setValue_array_setNeedsUpdate(J,Q){let $=this.resolvedProperty;for(let W=0,K=$.length;W!==K;++W)$[W]=J[Q++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(J,Q){let $=this.resolvedProperty;for(let W=0,K=$.length;W!==K;++W)$[W]=J[Q++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q]}_setValue_arrayElement_setNeedsUpdate(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(J,Q){this.resolvedProperty.fromArray(J,Q)}_setValue_fromArray_setNeedsUpdate(J,Q){this.resolvedProperty.fromArray(J,Q),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(J,Q){this.resolvedProperty.fromArray(J,Q),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(J,Q){this.bind(),this.getValue(J,Q)}_setValue_unbound(J,Q){this.bind(),this.setValue(J,Q)}bind(){let J=this.node,Q=this.parsedPath,$=Q.objectName,W=Q.propertyName,K=Q.propertyIndex;if(!J)J=a0.findNode(this.rootNode,Q.nodeName),this.node=J;if(this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!J){P0("PropertyBinding: No target node found for track: "+this.path+".");return}if($){let X=Q.objectIndex;switch($){case"materials":if(!J.material){T0("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.materials){T0("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}J=J.material.materials;break;case"bones":if(!J.skeleton){T0("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}J=J.skeleton.bones;for(let U=0;U<J.length;U++)if(J[U].name===X){X=U;break}break;case"map":if("map"in J){J=J.map;break}if(!J.material){T0("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.map){T0("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}J=J.material.map;break;default:if(J[$]===void 0){T0("PropertyBinding: Can not bind to objectName of node undefined.",this);return}J=J[$]}if(X!==void 0){if(J[X]===void 0){T0("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,J);return}J=J[X]}}let Z=J[W];if(Z===void 0){let X=Q.nodeName;T0("PropertyBinding: Trying to update property for track: "+X+"."+W+" but it wasn't found.",J);return}let H=this.Versioning.None;if(this.targetObject=J,J.isMaterial===!0)H=this.Versioning.NeedsUpdate;else if(J.isObject3D===!0)H=this.Versioning.MatrixWorldNeedsUpdate;let Y=this.BindingType.Direct;if(K!==void 0){if(W==="morphTargetInfluences"){if(!J.geometry){T0("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!J.geometry.morphAttributes){T0("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}if(J.morphTargetDictionary[K]!==void 0)K=J.morphTargetDictionary[K]}Y=this.BindingType.ArrayElement,this.resolvedProperty=Z,this.propertyIndex=K}else if(Z.fromArray!==void 0&&Z.toArray!==void 0)Y=this.BindingType.HasFromToArray,this.resolvedProperty=Z;else if(Array.isArray(Z))Y=this.BindingType.EntireArray,this.resolvedProperty=Z;else this.propertyName=W;this.getValue=this.GetterByBindingType[Y],this.setValue=this.SetterByBindingTypeAndVersioning[Y][H]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}a0.Composite=zK;a0.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};a0.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};a0.prototype.GetterByBindingType=[a0.prototype._getValue_direct,a0.prototype._getValue_array,a0.prototype._getValue_arrayElement,a0.prototype._getValue_toArray];a0.prototype.SetterByBindingTypeAndVersioning=[[a0.prototype._setValue_direct,a0.prototype._setValue_direct_setNeedsUpdate,a0.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[a0.prototype._setValue_array,a0.prototype._setValue_array_setNeedsUpdate,a0.prototype._setValue_array_setMatrixWorldNeedsUpdate],[a0.prototype._setValue_arrayElement,a0.prototype._setValue_arrayElement_setNeedsUpdate,a0.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[a0.prototype._setValue_fromArray,a0.prototype._setValue_fromArray_setNeedsUpdate,a0.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var gN=new Float32Array(1);var OW=new KJ;class U6{constructor(J,Q,$=0,W=1/0){this.ray=new p8(J,Q),this.near=$,this.far=W,this.camera=null,this.layers=new U7,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(J,Q){this.ray.set(J,Q)}setFromCamera(J,Q){if(Q.isPerspectiveCamera)this.ray.origin.setFromMatrixPosition(Q.matrixWorld),this.ray.direction.set(J.x,J.y,0.5).unproject(Q).sub(this.ray.origin).normalize(),this.camera=Q;else if(Q.isOrthographicCamera)this.ray.origin.set(J.x,J.y,Q.projectionMatrix.elements[14]).unproject(Q),this.ray.direction.set(0,0,-1).transformDirection(Q.matrixWorld),this.camera=Q;else T0("Raycaster: Unsupported camera type: "+Q.type)}setFromXRController(J){return OW.identity().extractRotation(J.matrixWorld),this.ray.origin.setFromMatrixPosition(J.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(OW),this}intersectObject(J,Q=!0,$=[]){return l6(J,this,$,Q),$.sort(RW),$}intersectObjects(J,Q=!0,$=[]){for(let W=0,K=J.length;W<K;W++)l6(J[W],this,$,Q);return $.sort(RW),$}}function RW(J,Q){return J.distance-Q.distance}function l6(J,Q,$,W){let K=!0;if(J.layers.test(Q.layers)){if(J.raycast(Q,$)===!1)K=!1}if(K===!0&&W===!0){let Z=J.children;for(let H=0,Y=Z.length;H<Y;H++)l6(Z[H],Q,$,!0)}}class E7{constructor(J=1,Q=0,$=0){this.radius=J,this.phi=Q,this.theta=$}set(J,Q,$){return this.radius=J,this.phi=Q,this.theta=$,this}copy(J){return this.radius=J.radius,this.phi=J.phi,this.theta=J.theta,this}makeSafe(){return this.phi=b0(this.phi,0.000001,Math.PI-0.000001),this}setFromVector3(J){return this.setFromCartesianCoords(J.x,J.y,J.z)}setFromCartesianCoords(J,Q,$){if(this.radius=Math.sqrt(J*J+Q*Q+$*$),this.radius===0)this.theta=0,this.phi=0;else this.theta=Math.atan2(J,$),this.phi=Math.acos(b0(Q/this.radius,-1,1));return this}clone(){return new this.constructor().copy(this)}}class F${static{F$.prototype.isMatrix2=!0}constructor(J,Q,$,W){if(this.elements=[1,0,0,1],J!==void 0)this.set(J,Q,$,W)}identity(){return this.set(1,0,0,1),this}fromArray(J,Q=0){for(let $=0;$<4;$++)this.elements[$]=J[$+Q];return this}set(J,Q,$,W){let K=this.elements;return K[0]=J,K[2]=Q,K[1]=$,K[3]=W,this}}class G6 extends D9{constructor(J,Q=null){super();this.object=J,this.domElement=Q,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(J){if(this.domElement!==null)this.disconnect();this.domElement=J}disconnect(){}dispose(){}update(){}}function D$(J,Q,$,W){let K=yH(W);switch($){case 1021:return J*Q;case 1028:return J*Q/K.components*K.byteLength;case 1029:return J*Q/K.components*K.byteLength;case 1030:return J*Q*2/K.components*K.byteLength;case 1031:return J*Q*2/K.components*K.byteLength;case 1022:return J*Q*3/K.components*K.byteLength;case 1023:return J*Q*4/K.components*K.byteLength;case 1033:return J*Q*4/K.components*K.byteLength;case 33776:case 33777:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*8;case 33778:case 33779:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 35841:case 35843:return Math.max(J,16)*Math.max(Q,8)/4;case 35840:case 35842:return Math.max(J,8)*Math.max(Q,8)/2;case 36196:case 37492:case 37488:case 37489:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*8;case 37496:case 37490:case 37491:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 37808:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 37809:return Math.floor((J+4)/5)*Math.floor((Q+3)/4)*16;case 37810:return Math.floor((J+4)/5)*Math.floor((Q+4)/5)*16;case 37811:return Math.floor((J+5)/6)*Math.floor((Q+4)/5)*16;case 37812:return Math.floor((J+5)/6)*Math.floor((Q+5)/6)*16;case 37813:return Math.floor((J+7)/8)*Math.floor((Q+4)/5)*16;case 37814:return Math.floor((J+7)/8)*Math.floor((Q+5)/6)*16;case 37815:return Math.floor((J+7)/8)*Math.floor((Q+7)/8)*16;case 37816:return Math.floor((J+9)/10)*Math.floor((Q+4)/5)*16;case 37817:return Math.floor((J+9)/10)*Math.floor((Q+5)/6)*16;case 37818:return Math.floor((J+9)/10)*Math.floor((Q+7)/8)*16;case 37819:return Math.floor((J+9)/10)*Math.floor((Q+9)/10)*16;case 37820:return Math.floor((J+11)/12)*Math.floor((Q+9)/10)*16;case 37821:return Math.floor((J+11)/12)*Math.floor((Q+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(J/4)*Math.ceil(Q/4)*16;case 36283:case 36284:return Math.ceil(J/4)*Math.ceil(Q/4)*8;case 36285:case 36286:return Math.ceil(J/4)*Math.ceil(Q/4)*16}throw Error(`Unable to determine texture byte length for ${$} format.`)}function yH(J){switch(J){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:case 35899:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${J}.`)}if(typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));if(typeof window<"u")if(window.__THREE__)P0("WARNING: Multiple instances of Three.js being imported.");else window.__THREE__="186";function nK(){let J=null,Q=!1,$=null,W=null;function K(Z,H){W=J.requestAnimationFrame(K),$(Z,H)}return{start:function(){if(Q===!0)return;if($===null)return;if(J===null)return;W=J.requestAnimationFrame(K),Q=!0},stop:function(){if(J!==null)J.cancelAnimationFrame(W);Q=!1},setAnimationLoop:function(Z){$=Z},setContext:function(Z){J=Z}}}function fH(J){let Q=new WeakMap;function $(Y,X){let{array:U,usage:N}=Y,E=U.byteLength,G=J.createBuffer();J.bindBuffer(X,G),J.bufferData(X,U,N),Y.onUploadCallback();let F;if(U instanceof Float32Array)F=J.FLOAT;else if(typeof Float16Array<"u"&&U instanceof Float16Array)F=J.HALF_FLOAT;else if(U instanceof Uint16Array)if(Y.isFloat16BufferAttribute)F=J.HALF_FLOAT;else F=J.UNSIGNED_SHORT;else if(U instanceof Int16Array)F=J.SHORT;else if(U instanceof Uint32Array)F=J.UNSIGNED_INT;else if(U instanceof Int32Array)F=J.INT;else if(U instanceof Int8Array)F=J.BYTE;else if(U instanceof Uint8Array)F=J.UNSIGNED_BYTE;else if(U instanceof Uint8ClampedArray)F=J.UNSIGNED_BYTE;else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: "+U);return{buffer:G,type:F,bytesPerElement:U.BYTES_PER_ELEMENT,version:Y.version,size:E}}function W(Y,X,U){let{array:N,updateRanges:E}=X;if(J.bindBuffer(U,Y),E.length===0)J.bufferSubData(U,0,N);else{E.sort((F,L)=>F.start-L.start);let G=0;for(let F=1;F<E.length;F++){let L=E[G],I=E[F];if(I.start<=L.start+L.count+1)L.count=Math.max(L.count,I.start+I.count-L.start);else++G,E[G]=I}E.length=G+1;for(let F=0,L=E.length;F<L;F++){let I=E[F];J.bufferSubData(U,I.start*N.BYTES_PER_ELEMENT,N,I.start,I.count)}X.clearUpdateRanges()}X.onUploadCallback()}function K(Y){if(Y.isInterleavedBufferAttribute)Y=Y.data;return Q.get(Y)}function Z(Y){if(Y.isInterleavedBufferAttribute)Y=Y.data;let X=Q.get(Y);if(X)J.deleteBuffer(X.buffer),Q.delete(Y)}function H(Y,X){if(Y.isInterleavedBufferAttribute)Y=Y.data;if(Y.isGLBufferAttribute){let N=Q.get(Y);if(!N||N.version<Y.version)Q.set(Y,{buffer:Y.buffer,type:Y.type,bytesPerElement:Y.elementSize,version:Y.version});return}let U=Q.get(Y);if(U===void 0)Q.set(Y,$(Y,X));else if(U.version<Y.version){if(U.size!==Y.array.byteLength)throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");W(U.buffer,Y,X),U.version=Y.version}}return{get:K,remove:Z,update:H}}var hH=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,vH=`#ifdef USE_ALPHAHASH
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
#endif`,bH=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,xH=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,gH=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,pH=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,mH=`#ifdef USE_AOMAP
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
#endif`,lH=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,dH=`#ifdef USE_BATCHING
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
#endif`,uH=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,cH=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,nH=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,sH=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,iH=`#ifdef USE_IRIDESCENCE
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
#endif`,oH=`#ifdef USE_BUMPMAP
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
#endif`,aH=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,rH=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,tH=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,eH=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,JY=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,QY=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,$Y=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,WY=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,KY=`#define PI 3.141592653589793
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
} // validated`,ZY=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,HY=`vec3 transformedNormal = objectNormal;
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
#endif`,YY=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,XY=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,UY=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,GY=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,NY="gl_FragColor = linearToOutputTexel( gl_FragColor );",qY=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,EY=`#ifdef USE_ENVMAP
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
#endif`,FY=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,DY=`#ifdef USE_ENVMAP
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
#endif`,OY=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,RY=`#ifdef USE_ENVMAP
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
#endif`,MY=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,LY=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,kY=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,VY=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,BY=`#ifdef USE_GRADIENTMAP
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
}`,IY=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,zY=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,AY=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,CY=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,PY=`#ifdef USE_ENVMAP
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
#endif`,wY=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,_Y=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,TY=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,SY=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,jY=`PhysicalMaterial material;
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
#endif`,yY=`uniform sampler2D dfgLUT;
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
}`,fY=`
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
#endif`,hY=`#if defined( RE_IndirectDiffuse )
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
#endif`,vY=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,bY=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,xY=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,gY=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,pY=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,mY=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,lY=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,dY=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,uY=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,cY=`#if defined( USE_POINTS_UV )
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
#endif`,nY=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,sY=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,iY=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,oY=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,aY=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,rY=`#ifdef USE_MORPHTARGETS
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
#endif`,tY=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,eY=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,JX=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,QX=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,$X=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,WX=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,KX=`#ifdef USE_NORMALMAP
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
#endif`,ZX=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,HX=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,YX=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,XX=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,UX=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,GX=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,NX=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,qX=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,EX=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,FX=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,DX=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,OX=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,RX=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,MX=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,LX=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,kX=`float getShadowMask() {
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
}`,VX=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,BX=`#ifdef USE_SKINNING
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
#endif`,IX=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,zX=`#ifdef USE_SKINNING
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
#endif`,AX=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,CX=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,PX=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,wX=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,_X=`#ifdef USE_TRANSMISSION
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
#endif`,TX=`#ifdef USE_TRANSMISSION
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
#endif`,SX=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,jX=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,yX=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,fX=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,hX=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,vX=`uniform sampler2D t2D;
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
}`,bX=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,xX=`#ifdef ENVMAP_TYPE_CUBE
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
}`,gX=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,pX=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mX=`#include <common>
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
}`,lX=`#if DEPTH_PACKING == 3200
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
}`,dX=`#define DISTANCE
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
}`,uX=`#define DISTANCE
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
}`,cX=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,nX=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,sX=`uniform float scale;
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
}`,iX=`uniform vec3 diffuse;
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
}`,oX=`#include <common>
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
}`,aX=`uniform vec3 diffuse;
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
}`,rX=`#define LAMBERT
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
}`,tX=`#define LAMBERT
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
}`,eX=`#define MATCAP
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
}`,JU=`#define MATCAP
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
}`,QU=`#define NORMAL
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
}`,$U=`#define NORMAL
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
}`,WU=`#define PHONG
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
}`,KU=`#define PHONG
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
}`,ZU=`#define STANDARD
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
}`,HU=`#define STANDARD
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
}`,YU=`#define TOON
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
}`,XU=`#define TOON
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
}`,UU=`uniform float size;
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
}`,GU=`uniform vec3 diffuse;
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
}`,NU=`#include <common>
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
}`,qU=`uniform vec3 color;
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
}`,EU=`uniform float rotation;
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
}`,FU=`uniform vec3 diffuse;
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
}`,h0={alphahash_fragment:hH,alphahash_pars_fragment:vH,alphamap_fragment:bH,alphamap_pars_fragment:xH,alphatest_fragment:gH,alphatest_pars_fragment:pH,aomap_fragment:mH,aomap_pars_fragment:lH,batching_pars_vertex:dH,batching_vertex:uH,begin_vertex:cH,beginnormal_vertex:nH,bsdfs:sH,iridescence_fragment:iH,bumpmap_pars_fragment:oH,clipping_planes_fragment:aH,clipping_planes_pars_fragment:rH,clipping_planes_pars_vertex:tH,clipping_planes_vertex:eH,color_fragment:JY,color_pars_fragment:QY,color_pars_vertex:$Y,color_vertex:WY,common:KY,cube_uv_reflection_fragment:ZY,defaultnormal_vertex:HY,displacementmap_pars_vertex:YY,displacementmap_vertex:XY,emissivemap_fragment:UY,emissivemap_pars_fragment:GY,colorspace_fragment:NY,colorspace_pars_fragment:qY,envmap_fragment:EY,envmap_common_pars_fragment:FY,envmap_pars_fragment:DY,envmap_pars_vertex:OY,envmap_physical_pars_fragment:PY,envmap_vertex:RY,fog_vertex:MY,fog_pars_vertex:LY,fog_fragment:kY,fog_pars_fragment:VY,gradientmap_pars_fragment:BY,lightmap_pars_fragment:IY,lights_lambert_fragment:zY,lights_lambert_pars_fragment:AY,lights_pars_begin:CY,lights_toon_fragment:wY,lights_toon_pars_fragment:_Y,lights_phong_fragment:TY,lights_phong_pars_fragment:SY,lights_physical_fragment:jY,lights_physical_pars_fragment:yY,lights_fragment_begin:fY,lights_fragment_maps:hY,lights_fragment_end:vY,lightprobes_pars_fragment:bY,logdepthbuf_fragment:xY,logdepthbuf_pars_fragment:gY,logdepthbuf_pars_vertex:pY,logdepthbuf_vertex:mY,map_fragment:lY,map_pars_fragment:dY,map_particle_fragment:uY,map_particle_pars_fragment:cY,metalnessmap_fragment:nY,metalnessmap_pars_fragment:sY,morphinstance_vertex:iY,morphcolor_vertex:oY,morphnormal_vertex:aY,morphtarget_pars_vertex:rY,morphtarget_vertex:tY,normal_fragment_begin:eY,normal_fragment_maps:JX,normal_pars_fragment:QX,normal_pars_vertex:$X,normal_vertex:WX,normalmap_pars_fragment:KX,clearcoat_normal_fragment_begin:ZX,clearcoat_normal_fragment_maps:HX,clearcoat_pars_fragment:YX,iridescence_pars_fragment:XX,opaque_fragment:UX,packing:GX,premultiplied_alpha_fragment:NX,project_vertex:qX,dithering_fragment:EX,dithering_pars_fragment:FX,roughnessmap_fragment:DX,roughnessmap_pars_fragment:OX,shadowmap_pars_fragment:RX,shadowmap_pars_vertex:MX,shadowmap_vertex:LX,shadowmask_pars_fragment:kX,skinbase_vertex:VX,skinning_pars_vertex:BX,skinning_vertex:IX,skinnormal_vertex:zX,specularmap_fragment:AX,specularmap_pars_fragment:CX,tonemapping_fragment:PX,tonemapping_pars_fragment:wX,transmission_fragment:_X,transmission_pars_fragment:TX,uv_pars_fragment:SX,uv_pars_vertex:jX,uv_vertex:yX,worldpos_vertex:fX,background_vert:hX,background_frag:vX,backgroundCube_vert:bX,backgroundCube_frag:xX,cube_vert:gX,cube_frag:pX,depth_vert:mX,depth_frag:lX,distance_vert:dX,distance_frag:uX,equirect_vert:cX,equirect_frag:nX,linedashed_vert:sX,linedashed_frag:iX,meshbasic_vert:oX,meshbasic_frag:aX,meshlambert_vert:rX,meshlambert_frag:tX,meshmatcap_vert:eX,meshmatcap_frag:JU,meshnormal_vert:QU,meshnormal_frag:$U,meshphong_vert:WU,meshphong_frag:KU,meshphysical_vert:ZU,meshphysical_frag:HU,meshtoon_vert:YU,meshtoon_frag:XU,points_vert:UU,points_frag:GU,shadow_vert:NU,shadow_frag:qU,sprite_vert:EU,sprite_frag:FU},G0={common:{diffuse:{value:new g0(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new j0},alphaMap:{value:null},alphaMapTransform:{value:new j0},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new j0}},envmap:{envMap:{value:null},envMapRotation:{value:new j0},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:0.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new j0}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new j0}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new j0},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new j0},normalScale:{value:new S0(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new j0},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new j0}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new j0}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new j0}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:0.00025},fogNear:{value:1},fogFar:{value:2000},fogColor:{value:new g0(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new f},probesMax:{value:new f},probesResolution:{value:new f}},points:{diffuse:{value:new g0(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new j0},alphaTest:{value:0},uvTransform:{value:new j0}},sprite:{diffuse:{value:new g0(16777215)},opacity:{value:1},center:{value:new S0(0.5,0.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new j0},alphaMap:{value:null},alphaMapTransform:{value:new j0},alphaTest:{value:0}}},R9={basic:{uniforms:TJ([G0.common,G0.specularmap,G0.envmap,G0.aomap,G0.lightmap,G0.fog]),vertexShader:h0.meshbasic_vert,fragmentShader:h0.meshbasic_frag},lambert:{uniforms:TJ([G0.common,G0.specularmap,G0.envmap,G0.aomap,G0.lightmap,G0.emissivemap,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.fog,G0.lights,{emissive:{value:new g0(0)},envMapIntensity:{value:1}}]),vertexShader:h0.meshlambert_vert,fragmentShader:h0.meshlambert_frag},phong:{uniforms:TJ([G0.common,G0.specularmap,G0.envmap,G0.aomap,G0.lightmap,G0.emissivemap,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.fog,G0.lights,{emissive:{value:new g0(0)},specular:{value:new g0(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:h0.meshphong_vert,fragmentShader:h0.meshphong_frag},standard:{uniforms:TJ([G0.common,G0.envmap,G0.aomap,G0.lightmap,G0.emissivemap,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.roughnessmap,G0.metalnessmap,G0.fog,G0.lights,{emissive:{value:new g0(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:h0.meshphysical_vert,fragmentShader:h0.meshphysical_frag},toon:{uniforms:TJ([G0.common,G0.aomap,G0.lightmap,G0.emissivemap,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.gradientmap,G0.fog,G0.lights,{emissive:{value:new g0(0)}}]),vertexShader:h0.meshtoon_vert,fragmentShader:h0.meshtoon_frag},matcap:{uniforms:TJ([G0.common,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.fog,{matcap:{value:null}}]),vertexShader:h0.meshmatcap_vert,fragmentShader:h0.meshmatcap_frag},points:{uniforms:TJ([G0.points,G0.fog]),vertexShader:h0.points_vert,fragmentShader:h0.points_frag},dashed:{uniforms:TJ([G0.common,G0.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:h0.linedashed_vert,fragmentShader:h0.linedashed_frag},depth:{uniforms:TJ([G0.common,G0.displacementmap]),vertexShader:h0.depth_vert,fragmentShader:h0.depth_frag},normal:{uniforms:TJ([G0.common,G0.bumpmap,G0.normalmap,G0.displacementmap,{opacity:{value:1}}]),vertexShader:h0.meshnormal_vert,fragmentShader:h0.meshnormal_frag},sprite:{uniforms:TJ([G0.sprite,G0.fog]),vertexShader:h0.sprite_vert,fragmentShader:h0.sprite_frag},background:{uniforms:{uvTransform:{value:new j0},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:h0.background_vert,fragmentShader:h0.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new j0}},vertexShader:h0.backgroundCube_vert,fragmentShader:h0.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:h0.cube_vert,fragmentShader:h0.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:h0.equirect_vert,fragmentShader:h0.equirect_frag},distance:{uniforms:TJ([G0.common,G0.displacementmap,{referencePosition:{value:new f},nearDistance:{value:1},farDistance:{value:1000}}]),vertexShader:h0.distance_vert,fragmentShader:h0.distance_frag},shadow:{uniforms:TJ([G0.lights,G0.fog,{color:{value:new g0(0)},opacity:{value:1}}]),vertexShader:h0.shadow_vert,fragmentShader:h0.shadow_frag}};R9.physical={uniforms:TJ([R9.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new j0},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new j0},clearcoatNormalScale:{value:new S0(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new j0},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new j0},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new j0},sheen:{value:0},sheenColor:{value:new g0(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new j0},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new j0},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new j0},transmissionSamplerSize:{value:new S0},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new j0},attenuationDistance:{value:0},attenuationColor:{value:new g0(0)},specularColor:{value:new g0(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new j0},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new j0},anisotropyVector:{value:new S0},anisotropyMap:{value:null},anisotropyMapTransform:{value:new j0}}]),vertexShader:h0.meshphysical_vert,fragmentShader:h0.meshphysical_frag};var N6={r:0,b:0,g:0},DU=new KJ,sK=new j0;sK.set(-1,0,0,0,1,0,0,0,1);function OU(J,Q,$,W,K,Z){let H=new g0(0),Y=K===!0?0:1,X,U,N=null,E=0,G=null;function F(A){let y=A.isScene===!0?A.background:null;if(y&&y.isTexture){let V=A.backgroundBlurriness>0;y=Q.get(y,V)}return y}function L(A){let y=!1,V=F(A);if(V===null)D(H,Y);else if(V&&V.isColor)D(V,1),y=!0;let z=J.xr.getEnvironmentBlendMode();if(z==="additive")$.buffers.color.setClear(0,0,0,1,Z);else if(z==="alpha-blend")$.buffers.color.setClear(0,0,0,0,Z);if(J.autoClear||y)$.buffers.depth.setTest(!0),$.buffers.depth.setMask(!0),$.buffers.color.setMask(!0),J.clear(J.autoClearColor,J.autoClearDepth,J.autoClearStencil)}function I(A,y){let V=F(y);if(V&&(V.isCubeTexture||V.mapping===Z7)){if(U===void 0)U=new zJ(new m9(1,1,1),new SJ({name:"BackgroundCubeMaterial",uniforms:K8(R9.backgroundCube.uniforms),vertexShader:R9.backgroundCube.vertexShader,fragmentShader:R9.backgroundCube.fragmentShader,side:bJ,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),U.geometry.deleteAttribute("normal"),U.geometry.deleteAttribute("uv"),U.onBeforeRender=function(z,C,P){this.matrixWorld.copyPosition(P.matrixWorld)},Object.defineProperty(U.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),W.update(U);if(U.material.uniforms.envMap.value=V,U.material.uniforms.backgroundBlurriness.value=y.backgroundBlurriness,U.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,U.material.uniforms.backgroundRotation.value.setFromMatrix4(DU.makeRotationFromEuler(y.backgroundRotation)).transpose(),V.isCubeTexture&&V.isRenderTargetTexture===!1)U.material.uniforms.backgroundRotation.value.premultiply(sK);if(U.material.toneMapped=m0.getTransfer(V.colorSpace)!==JJ,N!==V||E!==V.version||G!==J.toneMapping)U.material.needsUpdate=!0,N=V,E=V.version,G=J.toneMapping;U.layers.enableAll(),A.unshift(U,U.geometry,U.material,0,0,null)}else if(V&&V.isTexture){if(X===void 0)X=new zJ(new W8(2,2),new SJ({name:"BackgroundMaterial",uniforms:K8(R9.background.uniforms),vertexShader:R9.background.vertexShader,fragmentShader:R9.background.fragmentShader,side:f8,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),X.geometry.deleteAttribute("normal"),Object.defineProperty(X.material,"map",{get:function(){return this.uniforms.t2D.value}}),W.update(X);if(X.material.uniforms.t2D.value=V,X.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,X.material.toneMapped=m0.getTransfer(V.colorSpace)!==JJ,V.matrixAutoUpdate===!0)V.updateMatrix();if(X.material.uniforms.uvTransform.value.copy(V.matrix),N!==V||E!==V.version||G!==J.toneMapping)X.material.needsUpdate=!0,N=V,E=V.version,G=J.toneMapping;X.layers.enableAll(),A.unshift(X,X.geometry,X.material,0,0,null)}}function D(A,y){A.getRGB(N6,aQ(J)),$.buffers.color.setClear(N6.r,N6.g,N6.b,y,Z)}function q(){if(U!==void 0)U.geometry.dispose(),U.material.dispose(),U=void 0;if(X!==void 0)X.geometry.dispose(),X.material.dispose(),X=void 0}return{getClearColor:function(){return H},setClearColor:function(A,y=1){H.set(A),Y=y,D(H,Y)},getClearAlpha:function(){return Y},setClearAlpha:function(A){Y=A,D(H,Y)},render:L,addToRenderList:I,dispose:q}}function RU(J,Q){let $=J.getParameter(J.MAX_VERTEX_ATTRIBS),W={},K=G(null),Z=K,H=!1;function Y(h,v,r,S,d){let o=!1,m=E(h,S,r,v);if(Z!==m)Z=m,U(Z.object);if(o=F(h,S,r,d),o)L(h,S,r,d);if(d!==null)Q.update(d,J.ELEMENT_ARRAY_BUFFER);if(o||H){if(H=!1,V(h,v,r,S),d!==null)J.bindBuffer(J.ELEMENT_ARRAY_BUFFER,Q.get(d).buffer)}}function X(){return J.createVertexArray()}function U(h){return J.bindVertexArray(h)}function N(h){return J.deleteVertexArray(h)}function E(h,v,r,S){let d=S.wireframe===!0,o=W[v.id];if(o===void 0)o={},W[v.id]=o;let m=h.isInstancedMesh===!0?h.id:0,Q0=o[m];if(Q0===void 0)Q0={},o[m]=Q0;let c=Q0[r.id];if(c===void 0)c={},Q0[r.id]=c;let a=c[d];if(a===void 0)a=G(X()),c[d]=a;return a}function G(h){let v=[],r=[],S=[];for(let d=0;d<$;d++)v[d]=0,r[d]=0,S[d]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:v,enabledAttributes:r,attributeDivisors:S,object:h,attributes:{},index:null}}function F(h,v,r,S){let d=Z.attributes,o=v.attributes,m=0,Q0=r.getAttributes();for(let c in Q0)if(Q0[c].location>=0){let J0=d[c],w0=o[c];if(w0===void 0){if(c==="instanceMatrix"&&h.instanceMatrix)w0=h.instanceMatrix;if(c==="instanceColor"&&h.instanceColor)w0=h.instanceColor}if(J0===void 0)return!0;if(J0.attribute!==w0)return!0;if(w0&&J0.data!==w0.data)return!0;m++}if(Z.attributesNum!==m)return!0;if(Z.index!==S)return!0;return!1}function L(h,v,r,S){let d={},o=v.attributes,m=0,Q0=r.getAttributes();for(let c in Q0)if(Q0[c].location>=0){let J0=o[c];if(J0===void 0){if(c==="instanceMatrix"&&h.instanceMatrix)J0=h.instanceMatrix;if(c==="instanceColor"&&h.instanceColor)J0=h.instanceColor}let w0={};if(w0.attribute=J0,J0&&J0.data)w0.data=J0.data;d[c]=w0,m++}Z.attributes=d,Z.attributesNum=m,Z.index=S}function I(){let h=Z.newAttributes;for(let v=0,r=h.length;v<r;v++)h[v]=0}function D(h){q(h,0)}function q(h,v){let{newAttributes:r,enabledAttributes:S,attributeDivisors:d}=Z;if(r[h]=1,S[h]===0)J.enableVertexAttribArray(h),S[h]=1;if(d[h]!==v)J.vertexAttribDivisor(h,v),d[h]=v}function A(){let{newAttributes:h,enabledAttributes:v}=Z;for(let r=0,S=v.length;r<S;r++)if(v[r]!==h[r])J.disableVertexAttribArray(r),v[r]=0}function y(h,v,r,S,d,o,m){if(m===!0)J.vertexAttribIPointer(h,v,r,d,o);else J.vertexAttribPointer(h,v,r,S,d,o)}function V(h,v,r,S){I();let d=S.attributes,o=r.getAttributes(),m=v.defaultAttributeValues;for(let Q0 in o){let c=o[Q0];if(c.location>=0){let a=d[Q0];if(a===void 0){if(Q0==="instanceMatrix"&&h.instanceMatrix)a=h.instanceMatrix;if(Q0==="instanceColor"&&h.instanceColor)a=h.instanceColor}if(a!==void 0){let{normalized:J0,itemSize:w0}=a,z0=Q.get(a);if(z0===void 0)continue;let{buffer:QJ,type:v0,bytesPerElement:n}=z0,$0=v0===J.INT||v0===J.UNSIGNED_INT||a.gpuType===QQ;if(a.isInterleavedBufferAttribute){let K0=a.data,A0=K0.stride,_0=a.offset;if(K0.isInstancedInterleavedBuffer){for(let B0=0;B0<c.locationSize;B0++)q(c.location+B0,K0.meshPerAttribute);if(h.isInstancedMesh!==!0&&S._maxInstanceCount===void 0)S._maxInstanceCount=K0.meshPerAttribute*K0.count}else for(let B0=0;B0<c.locationSize;B0++)D(c.location+B0);J.bindBuffer(J.ARRAY_BUFFER,QJ);for(let B0=0;B0<c.locationSize;B0++)y(c.location+B0,w0/c.locationSize,v0,J0,A0*n,(_0+w0/c.locationSize*B0)*n,$0)}else{if(a.isInstancedBufferAttribute){for(let K0=0;K0<c.locationSize;K0++)q(c.location+K0,a.meshPerAttribute);if(h.isInstancedMesh!==!0&&S._maxInstanceCount===void 0)S._maxInstanceCount=a.meshPerAttribute*a.count}else for(let K0=0;K0<c.locationSize;K0++)D(c.location+K0);J.bindBuffer(J.ARRAY_BUFFER,QJ);for(let K0=0;K0<c.locationSize;K0++)y(c.location+K0,w0/c.locationSize,v0,J0,w0*n,w0/c.locationSize*K0*n,$0)}}else if(m!==void 0){let J0=m[Q0];if(J0!==void 0)switch(J0.length){case 2:J.vertexAttrib2fv(c.location,J0);break;case 3:J.vertexAttrib3fv(c.location,J0);break;case 4:J.vertexAttrib4fv(c.location,J0);break;default:J.vertexAttrib1fv(c.location,J0)}}}}A()}function z(){B();for(let h in W){let v=W[h];for(let r in v){let S=v[r];for(let d in S){let o=S[d];for(let m in o)N(o[m].object),delete o[m];delete S[d]}}delete W[h]}}function C(h){if(W[h.id]===void 0)return;let v=W[h.id];for(let r in v){let S=v[r];for(let d in S){let o=S[d];for(let m in o)N(o[m].object),delete o[m];delete S[d]}}delete W[h.id]}function P(h){for(let v in W){let r=W[v];for(let S in r){let d=r[S];if(d[h.id]===void 0)continue;let o=d[h.id];for(let m in o)N(o[m].object),delete o[m];delete d[h.id]}}}function M(h){for(let v in W){let r=W[v],S=h.isInstancedMesh===!0?h.id:0,d=r[S];if(d===void 0)continue;for(let o in d){let m=d[o];for(let Q0 in m)N(m[Q0].object),delete m[Q0];delete d[o]}if(delete r[S],Object.keys(r).length===0)delete W[v]}}function B(){if(l(),H=!0,Z===K)return;Z=K,U(Z.object)}function l(){K.geometry=null,K.program=null,K.wireframe=!1}return{setup:Y,reset:B,resetDefaultState:l,dispose:z,releaseStatesOfGeometry:C,releaseStatesOfObject:M,releaseStatesOfProgram:P,initAttributes:I,enableAttribute:D,disableUnusedAttributes:A}}function MU(J,Q,$){let W;function K(X){W=X}function Z(X,U){J.drawArrays(W,X,U),$.update(U,W,1)}function H(X,U,N){if(N===0)return;J.drawArraysInstanced(W,X,U,N),$.update(U,W,N)}function Y(X,U,N){if(N===0)return;Q.get("WEBGL_multi_draw").multiDrawArraysWEBGL(W,X,0,U,0,N);let G=0;for(let F=0;F<N;F++)G+=U[F];$.update(G,W,1)}this.setMode=K,this.render=Z,this.renderInstances=H,this.renderMultiDraw=Y}function LU(J,Q,$,W){let K;function Z(){if(K!==void 0)return K;if(Q.has("EXT_texture_filter_anisotropic")===!0){let P=Q.get("EXT_texture_filter_anisotropic");K=J.getParameter(P.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else K=0;return K}function H(P){if(P!==F9&&W.convert(P)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_FORMAT))return!1;return!0}function Y(P){let M=P===E9&&(Q.has("EXT_color_buffer_half_float")||Q.has("EXT_color_buffer_float"));if(P!==H9&&P!==C9&&!M&&W.convert(P)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_TYPE))return!1;return!0}function X(P){if(P==="highp"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.HIGH_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.HIGH_FLOAT).precision>0)return"highp";P="mediump"}if(P==="mediump"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.MEDIUM_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.MEDIUM_FLOAT).precision>0)return"mediump"}return"lowp"}let U=$.precision!==void 0?$.precision:"highp",N=X(U);if(N!==U)P0("WebGLRenderer:",U,"not supported, using",N,"instead."),U=N;let E=$.logarithmicDepthBuffer===!0,G=$.reversedDepthBuffer===!0&&Q.has("EXT_clip_control");if($.reversedDepthBuffer===!0&&G===!1)P0("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let F=J.getParameter(J.MAX_TEXTURE_IMAGE_UNITS),L=J.getParameter(J.MAX_VERTEX_TEXTURE_IMAGE_UNITS),I=J.getParameter(J.MAX_TEXTURE_SIZE),D=J.getParameter(J.MAX_CUBE_MAP_TEXTURE_SIZE),q=J.getParameter(J.MAX_VERTEX_ATTRIBS),A=J.getParameter(J.MAX_VERTEX_UNIFORM_VECTORS),y=J.getParameter(J.MAX_VARYING_VECTORS),V=J.getParameter(J.MAX_FRAGMENT_UNIFORM_VECTORS),z=J.getParameter(J.MAX_SAMPLES),C=J.getParameter(J.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:Z,getMaxPrecision:X,textureFormatReadable:H,textureTypeReadable:Y,precision:U,logarithmicDepthBuffer:E,reversedDepthBuffer:G,maxTextures:F,maxVertexTextures:L,maxTextureSize:I,maxCubemapSize:D,maxAttributes:q,maxVertexUniforms:A,maxVaryings:y,maxFragmentUniforms:V,maxSamples:z,samples:C}}function kU(J){let Q=this,$=null,W=0,K=!1,Z=!1,H=new iJ,Y=new j0,X={value:null,needsUpdate:!1};this.uniform=X,this.numPlanes=0,this.numIntersection=0,this.init=function(E,G){let F=E.length!==0||G||W!==0||K;return K=G,W=E.length,F},this.beginShadows=function(){Z=!0,N(null)},this.endShadows=function(){Z=!1},this.setGlobalState=function(E,G){$=N(E,G,0)},this.setState=function(E,G,F){let{clippingPlanes:L,clipIntersection:I,clipShadows:D}=E,q=J.get(E);if(!K||L===null||L.length===0||Z&&!D)if(Z)N(null);else U();else{let A=Z?0:W,y=A*4,V=q.clippingState||null;X.value=V,V=N(L,G,y,F);for(let z=0;z!==y;++z)V[z]=$[z];q.clippingState=V,this.numIntersection=I?this.numPlanes:0,this.numPlanes+=A}};function U(){if(X.value!==$)X.value=$,X.needsUpdate=W>0;Q.numPlanes=W,Q.numIntersection=0}function N(E,G,F,L){let I=E!==null?E.length:0,D=null;if(I!==0){if(D=X.value,L!==!0||D===null){let q=F+I*4,A=G.matrixWorldInverse;if(Y.getNormalMatrix(A),D===null||D.length<q)D=new Float32Array(q);for(let y=0,V=F;y!==I;++y,V+=4)H.copy(E[y]).applyMatrix4(A,Y),H.normal.toArray(D,V),D[V+3]=H.constant}X.value=D,X.needsUpdate=!0}return Q.numPlanes=I,Q.numIntersection=0,D}}var d8=4,VU=6,BU=20,IU=256,F7=new m8,AK=new g0,O$=null,R$=0,M$=0,L$=!1,zU=new f,X8=new f;class B${constructor(J){this._renderer=J,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(J,Q=0,$=0.1,W=100,K={}){let{size:Z=256,position:H=zU}=K;O$=this._renderer.getRenderTarget(),R$=this._renderer.getActiveCubeFace(),M$=this._renderer.getActiveMipmapLevel(),L$=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(Z);let Y=this._allocateTargets();if(Y.depthBuffer=!0,this._sceneToCubeUV(J,$,W,Y,H),Q>0)this._blur(Y,0,0,Q);return this._applyPMREM(Y),this._cleanup(Y),Y}fromEquirectangular(J,Q=null){return this._fromTexture(J,Q)}fromCubemap(J,Q=null){return this._fromTexture(J,Q)}compileCubemapShader(){if(this._cubemapMaterial===null)this._cubemapMaterial=wK(),this._compileMaterial(this._cubemapMaterial)}compileEquirectangularShader(){if(this._equirectMaterial===null)this._equirectMaterial=PK(),this._compileMaterial(this._equirectMaterial)}dispose(){if(this._dispose(),this._cubemapMaterial!==null)this._cubemapMaterial.dispose();if(this._equirectMaterial!==null)this._equirectMaterial.dispose();if(this._backgroundBox!==null)this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose()}_setSize(J){this._lodMax=Math.floor(Math.log2(J)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){if(this._blurMaterial!==null)this._blurMaterial.dispose();if(this._ggxMaterial!==null)this._ggxMaterial.dispose();if(this._pingPongRenderTarget!==null)this._pingPongRenderTarget.dispose();for(let J=0;J<this._lodMeshes.length;J++)this._lodMeshes[J].geometry.dispose()}_cleanup(J){this._renderer.setRenderTarget(O$,R$,M$),this._renderer.xr.enabled=L$,J.scissorTest=!1,l8(J,0,0,J.width,J.height)}_fromTexture(J,Q){if(J.mapping===v8||J.mapping===o9)this._setSize(J.image.length===0?16:J.image[0].width||J.image[0].image.width);else this._setSize(J.image.width/4);O$=this._renderer.getRenderTarget(),R$=this._renderer.getActiveCubeFace(),M$=this._renderer.getActiveMipmapLevel(),L$=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let $=Q||this._allocateTargets();return this._textureToCubeUV(J,$),this._applyPMREM($),this._cleanup($),$}_allocateTargets(){let J=3*Math.max(this._cubeSize,112),Q=4*this._cubeSize,$={magFilter:xJ,minFilter:xJ,generateMipmaps:!1,type:E9,format:F9,colorSpace:xQ,depthBuffer:!1},W=CK(J,Q,$);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==J||this._pingPongRenderTarget.height!==Q){if(this._pingPongRenderTarget!==null)this._dispose();this._pingPongRenderTarget=CK(J,Q,$);let{_lodMax:K}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=AU(K)),this._blurMaterial=PU(K,J,Q),this._ggxMaterial=CU(K,J,Q)}return W}_compileMaterial(J){let Q=new zJ(new gJ,J);this._renderer.compile(Q,F7)}_sceneToCubeUV(J,Q,$,W,K){let Y=new uJ(90,1,Q,$),X=[1,-1,1,1,1,1],U=[1,1,1,-1,-1,-1],N=this._renderer,E=N.autoClear,G=N.toneMapping;if(N.getClearColor(AK),N.toneMapping=Z9,N.autoClear=!1,N.state.buffers.depth.getReversed())N.setRenderTarget(W),N.clearDepth(),N.setRenderTarget(null);if(this._backgroundBox===null)this._backgroundBox=new zJ(new m9,new Q8({name:"PMREM.Background",side:bJ,depthWrite:!1,depthTest:!1}));let L=this._backgroundBox,I=L.material,D=!1,q=J.background;if(q){if(q.isColor)I.color.copy(q),J.background=null,D=!0}else I.color.copy(AK),D=!0;for(let A=0;A<6;A++){let y=A%3;if(y===0)Y.up.set(0,X[A],0),Y.position.set(K.x,K.y,K.z),Y.lookAt(K.x+U[A],K.y,K.z);else if(y===1)Y.up.set(0,0,X[A]),Y.position.set(K.x,K.y,K.z),Y.lookAt(K.x,K.y+U[A],K.z);else Y.up.set(0,X[A],0),Y.position.set(K.x,K.y,K.z),Y.lookAt(K.x,K.y,K.z+U[A]);let V=this._cubeSize;if(l8(W,y*V,A>2?V:0,V,V),N.setRenderTarget(W),D)N.render(L,Y);N.render(J,Y)}N.toneMapping=G,N.autoClear=E,J.background=q}_textureToCubeUV(J,Q){let $=this._renderer,W=J.mapping===v8||J.mapping===o9;if(W){if(this._cubemapMaterial===null)this._cubemapMaterial=wK();this._cubemapMaterial.uniforms.flipEnvMap.value=J.isRenderTargetTexture===!1?-1:1}else if(this._equirectMaterial===null)this._equirectMaterial=PK();let K=W?this._cubemapMaterial:this._equirectMaterial,Z=this._lodMeshes[0];Z.material=K;let H=K.uniforms;H.envMap.value=J;let Y=this._cubeSize;l8(Q,0,0,3*Y,2*Y),$.setRenderTarget(Q),$.render(Z,F7)}_applyPMREM(J){let Q=this._renderer,$=Q.autoClear;Q.autoClear=!1;let W=this._lodMeshes.length;for(let K=1;K<W;K++)this._applyGGXFilter(J,K-1,K);Q.autoClear=$}_applyGGXFilter(J,Q,$){let W=this._renderer,K=this._pingPongRenderTarget,Z=this._ggxMaterial,H=this._lodMeshes[$];H.material=Z;let Y=Z.uniforms,X=$/(this._lodMeshes.length-1),U=Q/(this._lodMeshes.length-1),N=Math.sqrt(X*X-U*U),E=X*1.25,G=N*E,{_lodMax:F}=this,L=this._sizeLods[$],I=3*L*($>F-d8?$-F+d8:0),D=4*(this._cubeSize-L);Y.envMap.value=J.texture,Y.roughness.value=G,Y.mipInt.value=F-Q,l8(K,I,D,3*L,2*L),W.setRenderTarget(K),W.render(H,F7),Y.envMap.value=K.texture,Y.roughness.value=0,Y.mipInt.value=F-$,l8(J,I,D,3*L,2*L),W.setRenderTarget(J),W.render(H,F7)}_blur(J,Q,$,W){let K=this._pingPongRenderTarget,Z=Math.min(W,Math.PI)/Math.SQRT2;this._blurPass(J,K,Q,$,Z),this._blurPass(K,J,$,$,Z)}_blurPass(J,Q,$,W,K){let Z=this._renderer,H=this._blurMaterial,Y=this._lodMeshes[W];Y.material=H;let X=H.uniforms;X.envMap.value=J.texture,X.sigma.value=K,X.mipInt.value=this._lodMax-$;let U=this._sizeLods[W],N=3*U*(W>this._lodMax-d8?W-this._lodMax+d8:0),E=4*(this._cubeSize-U);l8(Q,N,E,3*U,2*U),Z.setRenderTarget(Q),Z.render(Y,F7)}}function AU(J){let Q=[],$=[],W=J,K=J-d8+1+VU;for(let Z=0;Z<K;Z++){let H=Math.pow(2,W);Q.push(H);let Y=1/(H-2),X=-Y,U=1+Y,N=[X,X,U,X,U,U,X,X,U,U,X,U],E=6,G=6,F=3,L=new Float32Array(F*G*E),I=new Float32Array(F*G*E);for(let q=0;q<E;q++){let A=q%3*2/3-1,y=q>2?0:-1,V=[A,y,0,A+0.6666666666666666,y,0,A+0.6666666666666666,y+1,0,A,y,0,A+0.6666666666666666,y+1,0,A,y+1,0];L.set(V,F*G*q);for(let z=0;z<G;z++){let C=N[z*2]*2-1,P=N[z*2+1]*2-1;if(q===0)X8.set(1,P,C);else if(q===1)X8.set(-C,1,-P);else if(q===2)X8.set(-C,P,1);else if(q===3)X8.set(-1,P,-C);else if(q===4)X8.set(-C,-1,P);else X8.set(C,P,-1);X8.toArray(I,(q*G+z)*F)}}let D=new gJ;if(D.setAttribute("position",new W9(L,F)),D.setAttribute("outputDirection",new W9(I,F)),$.push(new zJ(D,null)),W>d8)W--}return{lodMeshes:$,sizeLods:Q}}function CK(J,Q,$){let W=new cJ(J,Q,$);return W.texture.mapping=Z7,W.texture.name="PMREM.cubeUv",W.scissorTest=!0,W}function l8(J,Q,$,W,K){J.viewport.set(Q,$,W,K),J.scissor.set(Q,$,W,K)}function CU(J,Q,$){return new SJ({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:IU,CUBEUV_TEXEL_WIDTH:1/Q,CUBEUV_TEXEL_HEIGHT:1/$,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:E6(),fragmentShader:`

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
		`,blending:q9,depthTest:!1,depthWrite:!1})}function PU(J,Q,$){return new SJ({name:"SphericalGaussianBlur",defines:{SAMPLES:BU,CUBEUV_TEXEL_WIDTH:1/Q,CUBEUV_TEXEL_HEIGHT:1/$,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:E6(),fragmentShader:`

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
		`,blending:q9,depthTest:!1,depthWrite:!1})}function PK(){return new SJ({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:E6(),fragmentShader:`

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
		`,blending:q9,depthTest:!1,depthWrite:!1})}function wK(){return new SJ({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:E6(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:q9,depthTest:!1,depthWrite:!1})}function E6(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}class A$ extends cJ{constructor(J=1,Q={}){super(J,J,Q);this.isWebGLCubeRenderTarget=!0;let $={width:J,height:J,depth:1},W=[$,$,$,$,$,$];this.texture=new Z6(W),this._setTextureOptions(Q),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(J,Q){this.texture.type=Q.type,this.texture.colorSpace=Q.colorSpace,this.texture.generateMipmaps=Q.generateMipmaps,this.texture.minFilter=Q.minFilter,this.texture.magFilter=Q.magFilter;let $={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},W=new m9(5,5,5),K=new SJ({name:"CubemapFromEquirect",uniforms:K8($.uniforms),vertexShader:$.vertexShader,fragmentShader:$.fragmentShader,side:bJ,blending:q9});K.uniforms.tEquirect.value=Q;let Z=new zJ(W,K),H=Q.minFilter;if(Q.minFilter===a9)Q.minFilter=xJ;return new G$(1,10,this).update(J,Z),Q.minFilter=H,Z.geometry.dispose(),Z.material.dispose(),this}clear(J,Q=!0,$=!0,W=!0){let K=J.getRenderTarget();for(let Z=0;Z<6;Z++)J.setRenderTarget(this,Z),J.clear(Q,$,W);J.setRenderTarget(K)}}function wU(J){let Q=new WeakMap,$=new WeakMap,W=null;function K(G,F=!1){if(G===null||G===void 0)return null;if(F)return H(G);return Z(G)}function Z(G){if(G&&G.isTexture){let F=G.mapping;if(F===l7||F===d7)if(Q.has(G)){let L=Q.get(G).texture;return Y(L,G.mapping)}else{let L=G.image;if(L&&L.height>0){let I=new A$(L.height);return I.fromEquirectangularTexture(J,G),Q.set(G,I),G.addEventListener("dispose",U),Y(I.texture,G.mapping)}else return null}}return G}function H(G){if(G&&G.isTexture){let F=G.mapping,L=F===l7||F===d7,I=F===v8||F===o9;if(L||I){let D=$.get(G),q=D!==void 0?D.texture.pmremVersion:0;if(G.isRenderTargetTexture&&G.pmremVersion!==q){if(W===null)W=new B$(J);return D=L?W.fromEquirectangular(G,D):W.fromCubemap(G,D),D.texture.pmremVersion=G.pmremVersion,$.set(G,D),D.texture}else if(D!==void 0)return D.texture;else{let A=G.image;if(L&&A&&A.height>0||I&&A&&X(A)){if(W===null)W=new B$(J);return D=L?W.fromEquirectangular(G):W.fromCubemap(G),D.texture.pmremVersion=G.pmremVersion,$.set(G,D),G.addEventListener("dispose",N),D.texture}else return null}}}return G}function Y(G,F){if(F===l7)G.mapping=v8;else if(F===d7)G.mapping=o9;return G}function X(G){let F=0,L=6;for(let I=0;I<L;I++)if(G[I]!==void 0)F++;return F===L}function U(G){let F=G.target;F.removeEventListener("dispose",U);let L=Q.get(F);if(L!==void 0)Q.delete(F),L.dispose()}function N(G){let F=G.target;F.removeEventListener("dispose",N);let L=$.get(F);if(L!==void 0)$.delete(F),L.dispose()}function E(){if(Q=new WeakMap,$=new WeakMap,W!==null)W.dispose(),W=null}return{get:K,dispose:E}}function _U(J){let Q={};function $(W){if(Q[W]!==void 0)return Q[W];let K=J.getExtension(W);return Q[W]=K,K}return{has:function(W){return $(W)!==null},init:function(){$("EXT_color_buffer_float"),$("WEBGL_clip_cull_distance"),$("OES_texture_float_linear"),$("EXT_color_buffer_half_float"),$("WEBGL_multisampled_render_to_texture"),$("WEBGL_render_shared_exponent")},get:function(W){let K=$(W);if(K===null)i9("WebGLRenderer: "+W+" extension not supported.");return K}}}function TU(J,Q,$,W){let K={},Z=new WeakMap;function H(E){let G=E.target;if(G.index!==null)Q.remove(G.index);for(let L in G.attributes)Q.remove(G.attributes[L]);G.removeEventListener("dispose",H),delete K[G.id];let F=Z.get(G);if(F)Q.remove(F),Z.delete(G);if(W.releaseStatesOfGeometry(G),G.isInstancedBufferGeometry===!0)delete G._maxInstanceCount;$.memory.geometries--}function Y(E,G){if(K[G.id]===!0)return G;return G.addEventListener("dispose",H),K[G.id]=!0,$.memory.geometries++,G}function X(E){let G=E.attributes;for(let F in G)Q.update(G[F],J.ARRAY_BUFFER)}function U(E){let G=[],F=E.index,L=E.attributes.position,I=0;if(L===void 0)return;if(F!==null){let A=F.array;I=F.version;for(let y=0,V=A.length;y<V;y+=3){let z=A[y+0],C=A[y+1],P=A[y+2];G.push(z,C,C,P,P,z)}}else{let A=L.array;I=L.version;for(let y=0,V=A.length/3-1;y<V;y+=3){let z=y+0,C=y+1,P=y+2;G.push(z,C,C,P,P,z)}}let D=new(L.count>=65535?W6:$6)(G,1);D.version=I;let q=Z.get(E);if(q)Q.remove(q);Z.set(E,D)}function N(E){let G=Z.get(E);if(G){let F=E.index;if(F!==null){if(G.version<F.version)U(E)}}else U(E);return Z.get(E)}return{get:Y,update:X,getWireframeAttribute:N}}function SU(J,Q,$){let W;function K(E){W=E}let Z,H;function Y(E){Z=E.type,H=E.bytesPerElement}function X(E,G){J.drawElements(W,G,Z,E*H),$.update(G,W,1)}function U(E,G,F){if(F===0)return;J.drawElementsInstanced(W,G,Z,E*H,F),$.update(G,W,F)}function N(E,G,F){if(F===0)return;Q.get("WEBGL_multi_draw").multiDrawElementsWEBGL(W,G,0,Z,E,0,F);let I=0;for(let D=0;D<F;D++)I+=G[D];$.update(I,W,1)}this.setMode=K,this.setIndex=Y,this.render=X,this.renderInstances=U,this.renderMultiDraw=N}function jU(J){let Q={geometries:0,textures:0},$={frame:0,calls:0,triangles:0,points:0,lines:0};function W(Z,H,Y){switch($.calls++,H){case J.TRIANGLES:$.triangles+=Y*(Z/3);break;case J.LINES:$.lines+=Y*(Z/2);break;case J.LINE_STRIP:$.lines+=Y*(Z-1);break;case J.LINE_LOOP:$.lines+=Y*Z;break;case J.POINTS:$.points+=Y*Z;break;default:T0("WebGLInfo: Unknown draw mode:",H);break}}function K(){$.calls=0,$.triangles=0,$.points=0,$.lines=0}return{memory:Q,render:$,programs:null,autoReset:!0,reset:K,update:W}}function yU(J,Q,$){let W=new WeakMap,K=new UJ;function Z(H,Y,X){let U=H.morphTargetInfluences,N=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,E=N!==void 0?N.length:0,G=W.get(Y);if(G===void 0||G.count!==E){let B=function(){P.dispose(),W.delete(Y),Y.removeEventListener("dispose",B)};if(G!==void 0)G.texture.dispose();let F=Y.morphAttributes.position!==void 0,L=Y.morphAttributes.normal!==void 0,I=Y.morphAttributes.color!==void 0,D=Y.morphAttributes.position||[],q=Y.morphAttributes.normal||[],A=Y.morphAttributes.color||[],y=0;if(F===!0)y=1;if(L===!0)y=2;if(I===!0)y=3;let V=Y.attributes.position.count*y,z=1;if(V>Q.maxTextureSize)z=Math.ceil(V/Q.maxTextureSize),V=Q.maxTextureSize;let C=new Float32Array(V*z*4*E),P=new J6(C,V,z,E);P.type=C9,P.needsUpdate=!0;let M=y*4;for(let l=0;l<E;l++){let h=D[l],v=q[l],r=A[l],S=V*z*4*l;for(let d=0;d<h.count;d++){let o=d*M;if(F===!0)K.fromBufferAttribute(h,d),C[S+o+0]=K.x,C[S+o+1]=K.y,C[S+o+2]=K.z,C[S+o+3]=0;if(L===!0)K.fromBufferAttribute(v,d),C[S+o+4]=K.x,C[S+o+5]=K.y,C[S+o+6]=K.z,C[S+o+7]=0;if(I===!0)K.fromBufferAttribute(r,d),C[S+o+8]=K.x,C[S+o+9]=K.y,C[S+o+10]=K.z,C[S+o+11]=r.itemSize===4?K.w:1}}G={count:E,texture:P,size:new S0(V,z)},W.set(Y,G),Y.addEventListener("dispose",B)}if(H.isInstancedMesh===!0&&H.morphTexture!==null)X.getUniforms().setValue(J,"morphTexture",H.morphTexture,$);else{let F=0;for(let I=0;I<U.length;I++)F+=U[I];let L=Y.morphTargetsRelative?1:1-F;X.getUniforms().setValue(J,"morphTargetBaseInfluence",L),X.getUniforms().setValue(J,"morphTargetInfluences",U)}X.getUniforms().setValue(J,"morphTargetsTexture",G.texture,$),X.getUniforms().setValue(J,"morphTargetsTextureSize",G.size)}return{update:Z}}function fU(J,Q,$,W,K){let Z=new WeakMap;function H(U){let N=K.render.frame,E=U.geometry,G=Q.get(U,E);if(Z.get(G)!==N)Q.update(G),Z.set(G,N);if(U.isInstancedMesh){if(U.hasEventListener("dispose",X)===!1)U.addEventListener("dispose",X);if(Z.get(U)!==N){if($.update(U.instanceMatrix,J.ARRAY_BUFFER),U.instanceColor!==null)$.update(U.instanceColor,J.ARRAY_BUFFER);Z.set(U,N)}}if(U.isSkinnedMesh){let F=U.skeleton;if(Z.get(F)!==N)F.update(),Z.set(F,N)}return G}function Y(){Z=new WeakMap}function X(U){let N=U.target;if(N.removeEventListener("dispose",X),W.releaseStatesOfObject(N),$.remove(N.instanceMatrix),N.instanceColor!==null)$.remove(N.instanceColor)}return{update:H,dispose:Y}}var hU={[i6]:"LINEAR_TONE_MAPPING",[o6]:"REINHARD_TONE_MAPPING",[a6]:"CINEON_TONE_MAPPING",[r6]:"ACES_FILMIC_TONE_MAPPING",[e6]:"AGX_TONE_MAPPING",[JQ]:"NEUTRAL_TONE_MAPPING",[t6]:"CUSTOM_TONE_MAPPING"};function vU(J,Q,$,W,K,Z){let H=new cJ(Q,$,{type:J,depthBuffer:K,stencilBuffer:Z,samples:W?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),Y=null,X=null,U=new gJ;U.setAttribute("position",new IJ([-1,3,0,-1,-1,0,3,-1,0],3)),U.setAttribute("uv",new IJ([0,2,0,0,2,0],2));let N=new rQ({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),E=new zJ(U,N),G=new m8(-1,1,1,-1,0,1),F=null,L=null,I=!1,D,q=null,A=[],y=!1;this.setSize=function(V,z){if(H.setSize(V,z),Y!==null)Y.setSize(V,z);if(X!==null)X.setSize(V,z);for(let C=0;C<A.length;C++){let P=A[C];if(P.setSize)P.setSize(V,z)}},this.setEffects=function(V){A=V,y=A.length>0&&A[0].isRenderPass===!0;let{width:z,height:C}=H;if(A.length>0&&Y===null)Y=new cJ(z,C,{type:E9,depthBuffer:!1,stencilBuffer:!1}),X=new cJ(z,C,{type:E9,depthBuffer:!1,stencilBuffer:!1});for(let P=0;P<A.length;P++){let M=A[P];if(M.setSize)M.setSize(z,C)}},this.begin=function(V,z){if(I)return!1;if(V.toneMapping===Z9&&A.length===0)return!1;if(q=z,z!==null){let{width:C,height:P}=z;if(H.width!==C||H.height!==P)this.setSize(C,P)}if(y===!1)V.setRenderTarget(H);return D=V.toneMapping,V.toneMapping=Z9,!0},this.hasRenderPass=function(){return y},this.end=function(V,z){V.toneMapping=D,I=!0;let C=H,P=Y;for(let M=0;M<A.length;M++){let B=A[M];if(B.enabled===!1)continue;if(B.render(V,P,C,z),B.needsSwap!==!1)C=P,P=P===Y?X:Y}if(F!==V.outputColorSpace||L!==V.toneMapping){if(F=V.outputColorSpace,L=V.toneMapping,N.defines={},m0.getTransfer(F)===JJ)N.defines.SRGB_TRANSFER="";let M=hU[L];if(M)N.defines[M]="";N.needsUpdate=!0}N.uniforms.tDiffuse.value=C.texture,V.setRenderTarget(q),V.render(E,G),q=null,I=!1},this.isCompositing=function(){return I},this.dispose=function(){if(H.dispose(),Y!==null)Y.dispose();if(X!==null)X.dispose();U.dispose(),N.dispose()}}var iK=new wJ,I$=new $8(1,1),oK=new J6,aK=new sQ,rK=new Z6,_K=[],TK=[],SK=new Float32Array(16),jK=new Float32Array(9),yK=new Float32Array(4);function u8(J,Q,$){let W=J[0];if(W<=0||W>0)return J;let K=Q*$,Z=_K[K];if(Z===void 0)Z=new Float32Array(K),_K[K]=Z;if(Q!==0){W.toArray(Z,0);for(let H=1,Y=0;H!==Q;++H)Y+=$,J[H].toArray(Z,Y)}return Z}function RJ(J,Q){if(J.length!==Q.length)return!1;for(let $=0,W=J.length;$<W;$++)if(J[$]!==Q[$])return!1;return!0}function MJ(J,Q){for(let $=0,W=Q.length;$<W;$++)J[$]=Q[$]}function F6(J,Q){let $=TK[Q];if($===void 0)$=new Int32Array(Q),TK[Q]=$;for(let W=0;W!==Q;++W)$[W]=J.allocateTextureUnit();return $}function bU(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1f(this.addr,Q),$[0]=Q}function xU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2f(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(RJ($,Q))return;J.uniform2fv(this.addr,Q),MJ($,Q)}}function gU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3f(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else if(Q.r!==void 0){if($[0]!==Q.r||$[1]!==Q.g||$[2]!==Q.b)J.uniform3f(this.addr,Q.r,Q.g,Q.b),$[0]=Q.r,$[1]=Q.g,$[2]=Q.b}else{if(RJ($,Q))return;J.uniform3fv(this.addr,Q),MJ($,Q)}}function pU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4f(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(RJ($,Q))return;J.uniform4fv(this.addr,Q),MJ($,Q)}}function mU(J,Q){let $=this.cache,W=Q.elements;if(W===void 0){if(RJ($,Q))return;J.uniformMatrix2fv(this.addr,!1,Q),MJ($,Q)}else{if(RJ($,W))return;yK.set(W),J.uniformMatrix2fv(this.addr,!1,yK),MJ($,W)}}function lU(J,Q){let $=this.cache,W=Q.elements;if(W===void 0){if(RJ($,Q))return;J.uniformMatrix3fv(this.addr,!1,Q),MJ($,Q)}else{if(RJ($,W))return;jK.set(W),J.uniformMatrix3fv(this.addr,!1,jK),MJ($,W)}}function dU(J,Q){let $=this.cache,W=Q.elements;if(W===void 0){if(RJ($,Q))return;J.uniformMatrix4fv(this.addr,!1,Q),MJ($,Q)}else{if(RJ($,W))return;SK.set(W),J.uniformMatrix4fv(this.addr,!1,SK),MJ($,W)}}function uU(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1i(this.addr,Q),$[0]=Q}function cU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2i(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(RJ($,Q))return;J.uniform2iv(this.addr,Q),MJ($,Q)}}function nU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3i(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else{if(RJ($,Q))return;J.uniform3iv(this.addr,Q),MJ($,Q)}}function sU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4i(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(RJ($,Q))return;J.uniform4iv(this.addr,Q),MJ($,Q)}}function iU(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1ui(this.addr,Q),$[0]=Q}function oU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2ui(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(RJ($,Q))return;J.uniform2uiv(this.addr,Q),MJ($,Q)}}function aU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3ui(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else{if(RJ($,Q))return;J.uniform3uiv(this.addr,Q),MJ($,Q)}}function rU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4ui(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(RJ($,Q))return;J.uniform4uiv(this.addr,Q),MJ($,Q)}}function tU(J,Q,$){let W=this.cache,K=$.allocateTextureUnit();if(W[0]!==K)J.uniform1i(this.addr,K),W[0]=K;let Z;if(this.type===J.SAMPLER_2D_SHADOW)I$.compareFunction=$.isReversedDepthBuffer()?e7:t7,Z=I$;else Z=iK;$.setTexture2D(Q||Z,K)}function eU(J,Q,$){let W=this.cache,K=$.allocateTextureUnit();if(W[0]!==K)J.uniform1i(this.addr,K),W[0]=K;$.setTexture3D(Q||aK,K)}function JG(J,Q,$){let W=this.cache,K=$.allocateTextureUnit();if(W[0]!==K)J.uniform1i(this.addr,K),W[0]=K;$.setTextureCube(Q||rK,K)}function QG(J,Q,$){let W=this.cache,K=$.allocateTextureUnit();if(W[0]!==K)J.uniform1i(this.addr,K),W[0]=K;$.setTexture2DArray(Q||oK,K)}function $G(J){switch(J){case 5126:return bU;case 35664:return xU;case 35665:return gU;case 35666:return pU;case 35674:return mU;case 35675:return lU;case 35676:return dU;case 5124:case 35670:return uU;case 35667:case 35671:return cU;case 35668:case 35672:return nU;case 35669:case 35673:return sU;case 5125:return iU;case 36294:return oU;case 36295:return aU;case 36296:return rU;case 35678:case 36198:case 36298:case 36306:case 35682:return tU;case 35679:case 36299:case 36307:return eU;case 35680:case 36300:case 36308:case 36293:return JG;case 36289:case 36303:case 36311:case 36292:return QG}}function WG(J,Q){J.uniform1fv(this.addr,Q)}function KG(J,Q){let $=u8(Q,this.size,2);J.uniform2fv(this.addr,$)}function ZG(J,Q){let $=u8(Q,this.size,3);J.uniform3fv(this.addr,$)}function HG(J,Q){let $=u8(Q,this.size,4);J.uniform4fv(this.addr,$)}function YG(J,Q){let $=u8(Q,this.size,4);J.uniformMatrix2fv(this.addr,!1,$)}function XG(J,Q){let $=u8(Q,this.size,9);J.uniformMatrix3fv(this.addr,!1,$)}function UG(J,Q){let $=u8(Q,this.size,16);J.uniformMatrix4fv(this.addr,!1,$)}function GG(J,Q){J.uniform1iv(this.addr,Q)}function NG(J,Q){J.uniform2iv(this.addr,Q)}function qG(J,Q){J.uniform3iv(this.addr,Q)}function EG(J,Q){J.uniform4iv(this.addr,Q)}function FG(J,Q){J.uniform1uiv(this.addr,Q)}function DG(J,Q){J.uniform2uiv(this.addr,Q)}function OG(J,Q){J.uniform3uiv(this.addr,Q)}function RG(J,Q){J.uniform4uiv(this.addr,Q)}function MG(J,Q,$){let W=this.cache,K=Q.length,Z=F6($,K);if(!RJ(W,Z))J.uniform1iv(this.addr,Z),MJ(W,Z);let H;if(this.type===J.SAMPLER_2D_SHADOW)H=I$;else H=iK;for(let Y=0;Y!==K;++Y)$.setTexture2D(Q[Y]||H,Z[Y])}function LG(J,Q,$){let W=this.cache,K=Q.length,Z=F6($,K);if(!RJ(W,Z))J.uniform1iv(this.addr,Z),MJ(W,Z);for(let H=0;H!==K;++H)$.setTexture3D(Q[H]||aK,Z[H])}function kG(J,Q,$){let W=this.cache,K=Q.length,Z=F6($,K);if(!RJ(W,Z))J.uniform1iv(this.addr,Z),MJ(W,Z);for(let H=0;H!==K;++H)$.setTextureCube(Q[H]||rK,Z[H])}function VG(J,Q,$){let W=this.cache,K=Q.length,Z=F6($,K);if(!RJ(W,Z))J.uniform1iv(this.addr,Z),MJ(W,Z);for(let H=0;H!==K;++H)$.setTexture2DArray(Q[H]||oK,Z[H])}function BG(J){switch(J){case 5126:return WG;case 35664:return KG;case 35665:return ZG;case 35666:return HG;case 35674:return YG;case 35675:return XG;case 35676:return UG;case 5124:case 35670:return GG;case 35667:case 35671:return NG;case 35668:case 35672:return qG;case 35669:case 35673:return EG;case 5125:return FG;case 36294:return DG;case 36295:return OG;case 36296:return RG;case 35678:case 36198:case 36298:case 36306:case 35682:return MG;case 35679:case 36299:case 36307:return LG;case 35680:case 36300:case 36308:case 36293:return kG;case 36289:case 36303:case 36311:case 36292:return VG}}class tK{constructor(J,Q,$){this.id=J,this.addr=$,this.cache=[],this.type=Q.type,this.setValue=$G(Q.type)}}class eK{constructor(J,Q,$){this.id=J,this.addr=$,this.cache=[],this.type=Q.type,this.size=Q.size,this.setValue=BG(Q.type)}}class JZ{constructor(J){this.id=J,this.seq=[],this.map={}}setValue(J,Q,$){let W=this.seq;for(let K=0,Z=W.length;K!==Z;++K){let H=W[K];H.setValue(J,Q[H.id],$)}}}var k$=/(\w+)(\])?(\[|\.)?/g;function fK(J,Q){J.seq.push(Q),J.map[Q.id]=Q}function IG(J,Q,$){let W=J.name,K=W.length;k$.lastIndex=0;while(!0){let Z=k$.exec(W),H=k$.lastIndex,Y=Z[1],X=Z[2]==="]",U=Z[3];if(X)Y=Y|0;if(U===void 0||U==="["&&H+2===K){fK($,U===void 0?new tK(Y,J,Q):new eK(Y,J,Q));break}else{let E=$.map[Y];if(E===void 0)E=new JZ(Y),fK($,E);$=E}}}class R7{constructor(J,Q){this.seq=[],this.map={};let $=J.getProgramParameter(Q,J.ACTIVE_UNIFORMS);for(let Z=0;Z<$;++Z){let H=J.getActiveUniform(Q,Z),Y=J.getUniformLocation(Q,H.name);IG(H,Y,this)}let W=[],K=[];for(let Z of this.seq)if(Z.type===J.SAMPLER_2D_SHADOW||Z.type===J.SAMPLER_CUBE_SHADOW||Z.type===J.SAMPLER_2D_ARRAY_SHADOW)W.push(Z);else K.push(Z);if(W.length>0)this.seq=W.concat(K)}setValue(J,Q,$,W){let K=this.map[Q];if(K!==void 0)K.setValue(J,$,W)}setOptional(J,Q,$){let W=Q[$];if(W!==void 0)this.setValue(J,$,W)}static upload(J,Q,$,W){for(let K=0,Z=Q.length;K!==Z;++K){let H=Q[K],Y=$[H.id];if(Y.needsUpdate!==!1)H.setValue(J,Y.value,W)}}static seqWithValue(J,Q){let $=[];for(let W=0,K=J.length;W!==K;++W){let Z=J[W];if(Z.id in Q)$.push(Z)}return $}}function hK(J,Q,$){let W=J.createShader(Q);return J.shaderSource(W,$),J.compileShader(W),W}var zG=37297,AG=0;function CG(J,Q){let $=J.split(`
`),W=[],K=Math.max(Q-6,0),Z=Math.min(Q+6,$.length);for(let H=K;H<Z;H++){let Y=H+1;W.push(`${Y===Q?">":" "} ${Y}: ${$[H]}`)}return W.join(`
`)}var vK=new j0;function PG(J){m0._getMatrix(vK,m0.workingColorSpace,J);let Q=`mat3( ${vK.elements.map(($)=>$.toFixed(4))} )`;switch(m0.getTransfer(J)){case gQ:return[Q,"LinearTransferOETF"];case JJ:return[Q,"sRGBTransferOETF"];default:return P0("WebGLProgram: Unsupported color space: ",J),[Q,"LinearTransferOETF"]}}function bK(J,Q,$){let W=J.getShaderParameter(Q,J.COMPILE_STATUS),Z=(J.getShaderInfoLog(Q)||"").trim();if(W&&Z==="")return"";let H=/ERROR: 0:(\d+)/.exec(Z);if(H){let Y=parseInt(H[1]);return $.toUpperCase()+`

`+Z+`

`+CG(J.getShaderSource(Q),Y)}else return Z}function wG(J,Q){let $=PG(Q);return[`vec4 ${J}( vec4 value ) {`,`	return ${$[1]}( vec4( value.rgb * ${$[0]}, value.a ) );`,"}"].join(`
`)}var _G={[i6]:"Linear",[o6]:"Reinhard",[a6]:"Cineon",[r6]:"ACESFilmic",[e6]:"AgX",[JQ]:"Neutral",[t6]:"Custom"};function TG(J,Q){let $=_G[Q];if($===void 0)return P0("WebGLProgram: Unsupported toneMapping:",Q),"vec3 "+J+"( vec3 color ) { return LinearToneMapping( color ); }";return"vec3 "+J+"( vec3 color ) { return "+$+"ToneMapping( color ); }"}var q6=new f;function SG(){m0.getLuminanceCoefficients(q6);let J=q6.x.toFixed(4),Q=q6.y.toFixed(4),$=q6.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${J}, ${Q}, ${$} );`,"\treturn dot( weights, rgb );","}"].join(`
`)}function jG(J){return[J.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",J.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(O7).join(`
`)}function yG(J){let Q=[];for(let $ in J){let W=J[$];if(W===!1)continue;Q.push("#define "+$+" "+W)}return Q.join(`
`)}function fG(J,Q){let $={},W=J.getProgramParameter(Q,J.ACTIVE_ATTRIBUTES);for(let K=0;K<W;K++){let Z=J.getActiveAttrib(Q,K),H=Z.name,Y=1;if(Z.type===J.FLOAT_MAT2)Y=2;if(Z.type===J.FLOAT_MAT3)Y=3;if(Z.type===J.FLOAT_MAT4)Y=4;$[H]={type:Z.type,location:J.getAttribLocation(Q,H),locationSize:Y}}return $}function O7(J){return J!==""}function xK(J,Q){let $=Q.numSpotLightShadows+Q.numSpotLightMaps-Q.numSpotLightShadowsWithMaps;return J.replace(/NUM_SUN_LIGHTS/g,Q.numSunLights).replace(/NUM_DIR_LIGHTS/g,Q.numDirLights).replace(/NUM_SPOT_LIGHTS/g,Q.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,Q.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,$).replace(/NUM_RECT_AREA_LIGHTS/g,Q.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,Q.numPointLights).replace(/NUM_HEMI_LIGHTS/g,Q.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,Q.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,Q.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,Q.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,Q.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,Q.numPointLightShadows)}function gK(J,Q){return J.replace(/NUM_CLIPPING_PLANES/g,Q.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,Q.numClippingPlanes-Q.numClipIntersection)}var hG=/^[ \t]*#include +<([\w\d./]+)>/gm;function z$(J){return J.replace(hG,bG)}var vG=new Map;function bG(J,Q){let $=h0[Q];if($===void 0){let W=vG.get(Q);if(W!==void 0)$=h0[W],P0('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',Q,W);else throw Error("THREE.WebGLProgram: Can not resolve #include <"+Q+">")}return z$($)}var xG=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function pK(J){return J.replace(xG,gG)}function gG(J,Q,$,W){let K="";for(let Z=parseInt(Q);Z<parseInt($);Z++)K+=W.replace(/\[\s*i\s*\]/g,"[ "+Z+" ]").replace(/UNROLLED_LOOP_INDEX/g,Z);return K}function mK(J){let Q=`precision ${J.precision} float;
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
#define LOW_PRECISION`;return Q}var pG={[W7]:"SHADOWMAP_TYPE_PCF",[y8]:"SHADOWMAP_TYPE_VSM"};function mG(J){return pG[J.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var lG={[v8]:"ENVMAP_TYPE_CUBE",[o9]:"ENVMAP_TYPE_CUBE",[Z7]:"ENVMAP_TYPE_CUBE_UV"};function dG(J){if(J.envMap===!1)return"ENVMAP_TYPE_CUBE";return lG[J.envMapMode]||"ENVMAP_TYPE_CUBE"}var uG={[o9]:"ENVMAP_MODE_REFRACTION"};function cG(J){if(J.envMap===!1)return"ENVMAP_MODE_REFLECTION";return uG[J.envMapMode]||"ENVMAP_MODE_REFLECTION"}var nG={[oW]:"ENVMAP_BLENDING_MULTIPLY",[aW]:"ENVMAP_BLENDING_MIX",[rW]:"ENVMAP_BLENDING_ADD"};function sG(J){if(J.envMap===!1)return"ENVMAP_BLENDING_NONE";return nG[J.combine]||"ENVMAP_BLENDING_NONE"}function iG(J){let Q=J.envMapCubeUVHeight;if(Q===null)return null;let $=Math.log2(Q)-2,W=1/Q;return{texelWidth:1/(3*Math.max(Math.pow(2,$),112)),texelHeight:W,maxMip:$}}function oG(J,Q,$,W){let K=J.getContext(),Z=$.defines,H=$.vertexShader,Y=$.fragmentShader,X=mG($),U=dG($),N=cG($),E=sG($),G=iG($),F=jG($),L=yG(Z),I=K.createProgram(),D,q,A=$.glslVersion?"#version "+$.glslVersion+`
`:"";if($.isRawShaderMaterial){if(D=["#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,L].filter(O7).join(`
`),D.length>0)D+=`
`;if(q=["#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,L].filter(O7).join(`
`),q.length>0)q+=`
`}else D=[mK($),"#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,L,$.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",$.batching?"#define USE_BATCHING":"",$.batchingColor?"#define USE_BATCHING_COLOR":"",$.instancing?"#define USE_INSTANCING":"",$.instancingColor?"#define USE_INSTANCING_COLOR":"",$.instancingMorph?"#define USE_INSTANCING_MORPH":"",$.useFog&&$.fog?"#define USE_FOG":"",$.useFog&&$.fogExp2?"#define FOG_EXP2":"",$.map?"#define USE_MAP":"",$.envMap?"#define USE_ENVMAP":"",$.envMap?"#define "+N:"",$.lightMap?"#define USE_LIGHTMAP":"",$.aoMap?"#define USE_AOMAP":"",$.bumpMap?"#define USE_BUMPMAP":"",$.normalMap?"#define USE_NORMALMAP":"",$.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",$.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",$.displacementMap?"#define USE_DISPLACEMENTMAP":"",$.emissiveMap?"#define USE_EMISSIVEMAP":"",$.anisotropy?"#define USE_ANISOTROPY":"",$.anisotropyMap?"#define USE_ANISOTROPYMAP":"",$.clearcoatMap?"#define USE_CLEARCOATMAP":"",$.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",$.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",$.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",$.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",$.specularMap?"#define USE_SPECULARMAP":"",$.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",$.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",$.roughnessMap?"#define USE_ROUGHNESSMAP":"",$.metalnessMap?"#define USE_METALNESSMAP":"",$.alphaMap?"#define USE_ALPHAMAP":"",$.alphaHash?"#define USE_ALPHAHASH":"",$.transmission?"#define USE_TRANSMISSION":"",$.transmissionMap?"#define USE_TRANSMISSIONMAP":"",$.thicknessMap?"#define USE_THICKNESSMAP":"",$.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",$.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",$.mapUv?"#define MAP_UV "+$.mapUv:"",$.alphaMapUv?"#define ALPHAMAP_UV "+$.alphaMapUv:"",$.lightMapUv?"#define LIGHTMAP_UV "+$.lightMapUv:"",$.aoMapUv?"#define AOMAP_UV "+$.aoMapUv:"",$.emissiveMapUv?"#define EMISSIVEMAP_UV "+$.emissiveMapUv:"",$.bumpMapUv?"#define BUMPMAP_UV "+$.bumpMapUv:"",$.normalMapUv?"#define NORMALMAP_UV "+$.normalMapUv:"",$.displacementMapUv?"#define DISPLACEMENTMAP_UV "+$.displacementMapUv:"",$.metalnessMapUv?"#define METALNESSMAP_UV "+$.metalnessMapUv:"",$.roughnessMapUv?"#define ROUGHNESSMAP_UV "+$.roughnessMapUv:"",$.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+$.anisotropyMapUv:"",$.clearcoatMapUv?"#define CLEARCOATMAP_UV "+$.clearcoatMapUv:"",$.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+$.clearcoatNormalMapUv:"",$.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+$.clearcoatRoughnessMapUv:"",$.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+$.iridescenceMapUv:"",$.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+$.iridescenceThicknessMapUv:"",$.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+$.sheenColorMapUv:"",$.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+$.sheenRoughnessMapUv:"",$.specularMapUv?"#define SPECULARMAP_UV "+$.specularMapUv:"",$.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+$.specularColorMapUv:"",$.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+$.specularIntensityMapUv:"",$.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+$.transmissionMapUv:"",$.thicknessMapUv?"#define THICKNESSMAP_UV "+$.thicknessMapUv:"",$.vertexTangents&&$.flatShading===!1?"#define USE_TANGENT":"",$.vertexNormals?"#define HAS_NORMAL":"",$.vertexColors?"#define USE_COLOR":"",$.vertexAlphas?"#define USE_COLOR_ALPHA":"",$.vertexUv1s?"#define USE_UV1":"",$.vertexUv2s?"#define USE_UV2":"",$.vertexUv3s?"#define USE_UV3":"",$.pointsUvs?"#define USE_POINTS_UV":"",$.flatShading?"#define FLAT_SHADED":"",$.skinning?"#define USE_SKINNING":"",$.morphTargets?"#define USE_MORPHTARGETS":"",$.morphNormals&&$.flatShading===!1?"#define USE_MORPHNORMALS":"",$.morphColors?"#define USE_MORPHCOLORS":"",$.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+$.morphTextureStride:"",$.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+$.morphTargetsCount:"",$.doubleSided?"#define DOUBLE_SIDED":"",$.flipSided?"#define FLIP_SIDED":"",$.shadowMapEnabled?"#define USE_SHADOWMAP":"",$.shadowMapEnabled?"#define "+X:"",$.sizeAttenuation?"#define USE_SIZEATTENUATION":"",$.numLightProbes>0?"#define USE_LIGHT_PROBES":"",$.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",$.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","\tattribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","\tattribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","\tuniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","\tattribute vec2 uv1;","#endif","#ifdef USE_UV2","\tattribute vec2 uv2;","#endif","#ifdef USE_UV3","\tattribute vec2 uv3;","#endif","#ifdef USE_TANGENT","\tattribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","\tattribute vec4 color;","#elif defined( USE_COLOR )","\tattribute vec3 color;","#endif","#ifdef USE_SKINNING","\tattribute vec4 skinIndex;","\tattribute vec4 skinWeight;","#endif",`
`].filter(O7).join(`
`),q=[mK($),"#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,L,$.useFog&&$.fog?"#define USE_FOG":"",$.useFog&&$.fogExp2?"#define FOG_EXP2":"",$.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",$.map?"#define USE_MAP":"",$.matcap?"#define USE_MATCAP":"",$.envMap?"#define USE_ENVMAP":"",$.envMap?"#define "+U:"",$.envMap?"#define "+N:"",$.envMap?"#define "+E:"",G?"#define CUBEUV_TEXEL_WIDTH "+G.texelWidth:"",G?"#define CUBEUV_TEXEL_HEIGHT "+G.texelHeight:"",G?"#define CUBEUV_MAX_MIP "+G.maxMip+".0":"",$.lightMap?"#define USE_LIGHTMAP":"",$.aoMap?"#define USE_AOMAP":"",$.bumpMap?"#define USE_BUMPMAP":"",$.normalMap?"#define USE_NORMALMAP":"",$.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",$.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",$.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",$.emissiveMap?"#define USE_EMISSIVEMAP":"",$.anisotropy?"#define USE_ANISOTROPY":"",$.anisotropyMap?"#define USE_ANISOTROPYMAP":"",$.clearcoat?"#define USE_CLEARCOAT":"",$.clearcoatMap?"#define USE_CLEARCOATMAP":"",$.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",$.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",$.dispersion?"#define USE_DISPERSION":"",$.retroreflection?"#define USE_RETROREFLECTION":"",$.iridescence?"#define USE_IRIDESCENCE":"",$.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",$.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",$.specularMap?"#define USE_SPECULARMAP":"",$.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",$.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",$.roughnessMap?"#define USE_ROUGHNESSMAP":"",$.metalnessMap?"#define USE_METALNESSMAP":"",$.alphaMap?"#define USE_ALPHAMAP":"",$.alphaTest?"#define USE_ALPHATEST":"",$.alphaHash?"#define USE_ALPHAHASH":"",$.sheen?"#define USE_SHEEN":"",$.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",$.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",$.transmission?"#define USE_TRANSMISSION":"",$.transmissionMap?"#define USE_TRANSMISSIONMAP":"",$.thicknessMap?"#define USE_THICKNESSMAP":"",$.vertexTangents&&$.flatShading===!1?"#define USE_TANGENT":"",$.vertexColors||$.instancingColor?"#define USE_COLOR":"",$.vertexAlphas||$.batchingColor?"#define USE_COLOR_ALPHA":"",$.vertexUv1s?"#define USE_UV1":"",$.vertexUv2s?"#define USE_UV2":"",$.vertexUv3s?"#define USE_UV3":"",$.pointsUvs?"#define USE_POINTS_UV":"",$.gradientMap?"#define USE_GRADIENTMAP":"",$.flatShading?"#define FLAT_SHADED":"",$.doubleSided?"#define DOUBLE_SIDED":"",$.flipSided?"#define FLIP_SIDED":"",$.shadowMapEnabled?"#define USE_SHADOWMAP":"",$.shadowMapEnabled?"#define "+X:"",$.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",$.numLightProbes>0?"#define USE_LIGHT_PROBES":"",$.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",$.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",$.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",$.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",$.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",$.toneMapping!==Z9?"#define TONE_MAPPING":"",$.toneMapping!==Z9?h0.tonemapping_pars_fragment:"",$.toneMapping!==Z9?TG("toneMapping",$.toneMapping):"",$.dithering?"#define DITHERING":"",$.opaque?"#define OPAQUE":"",h0.colorspace_pars_fragment,wG("linearToOutputTexel",$.outputColorSpace),SG(),$.useDepthPacking?"#define DEPTH_PACKING "+$.depthPacking:"",`
`].filter(O7).join(`
`);if(H=z$(H),H=xK(H,$),H=gK(H,$),Y=z$(Y),Y=xK(Y,$),Y=gK(Y,$),H=pK(H),Y=pK(Y),$.isRawShaderMaterial!==!0)A=`#version 300 es
`,D=[F,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+D,q=["#define varying in",$.glslVersion===pQ?"":"layout(location = 0) out highp vec4 pc_fragColor;",$.glslVersion===pQ?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+q;let y=A+D+H,V=A+q+Y,z=hK(K,K.VERTEX_SHADER,y),C=hK(K,K.FRAGMENT_SHADER,V);if(K.attachShader(I,z),K.attachShader(I,C),$.index0AttributeName!==void 0)K.bindAttribLocation(I,0,$.index0AttributeName);else if($.hasPositionAttribute===!0)K.bindAttribLocation(I,0,"position");K.linkProgram(I);function P(h){if(J.debug.checkShaderErrors){let v=K.getProgramInfoLog(I)||"",r=K.getShaderInfoLog(z)||"",S=K.getShaderInfoLog(C)||"",d=v.trim(),o=r.trim(),m=S.trim(),Q0=!0,c=!0;if(K.getProgramParameter(I,K.LINK_STATUS)===!1)if(Q0=!1,typeof J.debug.onShaderError==="function")J.debug.onShaderError(K,I,z,C);else{let a=bK(K,z,"vertex"),J0=bK(K,C,"fragment");T0("WebGLProgram: Shader Error "+K.getError()+" - VALIDATE_STATUS "+K.getProgramParameter(I,K.VALIDATE_STATUS)+`

Material Name: `+h.name+`
Material Type: `+h.type+`

Program Info Log: `+d+`
`+a+`
`+J0)}else if(d!=="")P0("WebGLProgram: Program Info Log:",d);else if(o===""||m==="")c=!1;if(c)h.diagnostics={runnable:Q0,programLog:d,vertexShader:{log:o,prefix:D},fragmentShader:{log:m,prefix:q}}}K.deleteShader(z),K.deleteShader(C),M=new R7(K,I),B=fG(K,I)}let M;this.getUniforms=function(){if(M===void 0)P(this);return M};let B;this.getAttributes=function(){if(B===void 0)P(this);return B};let l=$.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){if(l===!1)l=K.getProgramParameter(I,zG);return l},this.destroy=function(){W.releaseStatesOfProgram(this),K.deleteProgram(I),this.program=void 0},this.type=$.shaderType,this.name=$.shaderName,this.id=AG++,this.cacheKey=Q,this.usedTimes=1,this.program=I,this.vertexShader=z,this.fragmentShader=C,this}var aG=0;class QZ{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(J,Q,$){let W=this._getShaderCacheForMaterial(J);if(W.has(Q)===!1)W.add(Q),Q.usedTimes++;if(W.has($)===!1)W.add($),$.usedTimes++;return this}remove(J){let Q=this.materialCache.get(J);for(let $ of Q)if($.usedTimes--,$.usedTimes===0)this.shaderCache.delete($.code);return this.materialCache.delete(J),this}getVertexShaderStage(J){return this._getShaderStage(J.vertexShader)}getFragmentShaderStage(J){return this._getShaderStage(J.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(J){let Q=this.materialCache,$=Q.get(J);if($===void 0)$=new Set,Q.set(J,$);return $}_getShaderStage(J){let Q=this.shaderCache,$=Q.get(J);if($===void 0)$=new $Z(J),Q.set(J,$);return $}}class $Z{constructor(J){this.id=aG++,this.code=J,this.usedTimes=0}}function rG(J){return J===e9||J===a7||J===r7}function tG(J,Q,$,W,K,Z){let H=new U7,Y=new QZ,X=new Set,U=[],N=new Map,E=W.logarithmicDepthBuffer,G=W.precision,F={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function L(M){if(X.add(M),M===0)return"uv";return`uv${M}`}function I(M,B,l,h,v,r){let S=h.fog,d=v.geometry,o=M.isMeshStandardMaterial||M.isMeshLambertMaterial||M.isMeshPhongMaterial?h.environment:null,m=M.isMeshStandardMaterial||M.isMeshLambertMaterial&&!M.envMap||M.isMeshPhongMaterial&&!M.envMap,Q0=Q.get(M.envMap||o,m),c=!!Q0&&Q0.mapping===Z7?Q0.image.height:null,a=F[M.type];if(M.precision!==null){if(G=W.getMaxPrecision(M.precision),G!==M.precision)P0("WebGLProgram.getParameters:",M.precision,"not supported, using",G,"instead.")}let J0=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,w0=J0!==void 0?J0.length:0,z0=0;if(d.morphAttributes.position!==void 0)z0=1;if(d.morphAttributes.normal!==void 0)z0=2;if(d.morphAttributes.color!==void 0)z0=3;let QJ,v0,n,$0;if(a){let $J=R9[a];QJ=$J.vertexShader,v0=$J.fragmentShader}else{QJ=M.vertexShader,v0=M.fragmentShader;let $J=Y.getVertexShaderStage(M),s0=Y.getFragmentShaderStage(M);Y.update(M,$J,s0),n=$J.id,$0=s0.id}let K0=J.getRenderTarget(),A0=J.state.buffers.depth.getReversed(),_0=v.isInstancedMesh===!0,B0=v.isBatchedMesh===!0,FJ=!!M.map,p0=!!M.matcap,l0=!!Q0,o0=!!M.aoMap,d0=!!M.lightMap,BJ=!!M.bumpMap&&M.wireframe===!1,HJ=!!M.normalMap,hJ=!!M.displacementMap,DJ=!!M.emissiveMap,OJ=!!M.metalnessMap,_=!!M.roughnessMap,vJ=M.anisotropy>0,n0=M.clearcoat>0,XJ=M.dispersion>0,k=M.retroreflectivity>0,O=M.iridescence>0,w=M.sheen>0,g=M.transmission>0,e=vJ&&!!M.anisotropyMap,Z0=n0&&!!M.clearcoatMap,X0=n0&&!!M.clearcoatNormalMap,u=n0&&!!M.clearcoatRoughnessMap,i=O&&!!M.iridescenceMap,F0=O&&!!M.iridescenceThicknessMap,V0=w&&!!M.sheenColorMap,U0=w&&!!M.sheenRoughnessMap,W0=!!M.specularMap,I0=!!M.specularColorMap,C0=!!M.specularIntensityMap,c0=g&&!!M.transmissionMap,j=g&&!!M.thicknessMap,H0=!!M.gradientMap,s=!!M.alphaMap,Y0=M.alphaTest>0,D0=!!M.alphaHash,t=!!M.extensions,N0=Z9;if(M.toneMapped){if(K0===null||K0.isXRRenderTarget===!0)N0=J.toneMapping}let y0={shaderID:a,shaderType:M.type,shaderName:M.name,vertexShader:QJ,fragmentShader:v0,defines:M.defines,customVertexShaderID:n,customFragmentShaderID:$0,isRawShaderMaterial:M.isRawShaderMaterial===!0,glslVersion:M.glslVersion,precision:G,batching:B0,batchingColor:B0&&v._colorsTexture!==null,instancing:_0,instancingColor:_0&&v.instanceColor!==null,instancingMorph:_0&&v.morphTexture!==null,outputColorSpace:K0===null?J.outputColorSpace:K0.isXRRenderTarget===!0?K0.texture.colorSpace:m0.workingColorSpace,alphaToCoverage:!!M.alphaToCoverage,map:FJ,matcap:p0,envMap:l0,envMapMode:l0&&Q0.mapping,envMapCubeUVHeight:c,aoMap:o0,lightMap:d0,bumpMap:BJ,normalMap:HJ,displacementMap:hJ,emissiveMap:DJ,normalMapObjectSpace:HJ&&M.normalMapType===XK,normalMapTangentSpace:HJ&&M.normalMapType===bQ,packedNormalMap:HJ&&M.normalMapType===bQ&&rG(M.normalMap.format),metalnessMap:OJ,roughnessMap:_,anisotropy:vJ,anisotropyMap:e,clearcoat:n0,clearcoatMap:Z0,clearcoatNormalMap:X0,clearcoatRoughnessMap:u,dispersion:XJ,retroreflection:k,iridescence:O,iridescenceMap:i,iridescenceThicknessMap:F0,sheen:w,sheenColorMap:V0,sheenRoughnessMap:U0,specularMap:W0,specularColorMap:I0,specularIntensityMap:C0,transmission:g,transmissionMap:c0,thicknessMap:j,gradientMap:H0,opaque:M.transparent===!1&&M.blending===K7&&M.alphaToCoverage===!1,alphaMap:s,alphaTest:Y0,alphaHash:D0,combine:M.combine,mapUv:FJ&&L(M.map.channel),aoMapUv:o0&&L(M.aoMap.channel),lightMapUv:d0&&L(M.lightMap.channel),bumpMapUv:BJ&&L(M.bumpMap.channel),normalMapUv:HJ&&L(M.normalMap.channel),displacementMapUv:hJ&&L(M.displacementMap.channel),emissiveMapUv:DJ&&L(M.emissiveMap.channel),metalnessMapUv:OJ&&L(M.metalnessMap.channel),roughnessMapUv:_&&L(M.roughnessMap.channel),anisotropyMapUv:e&&L(M.anisotropyMap.channel),clearcoatMapUv:Z0&&L(M.clearcoatMap.channel),clearcoatNormalMapUv:X0&&L(M.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:u&&L(M.clearcoatRoughnessMap.channel),iridescenceMapUv:i&&L(M.iridescenceMap.channel),iridescenceThicknessMapUv:F0&&L(M.iridescenceThicknessMap.channel),sheenColorMapUv:V0&&L(M.sheenColorMap.channel),sheenRoughnessMapUv:U0&&L(M.sheenRoughnessMap.channel),specularMapUv:W0&&L(M.specularMap.channel),specularColorMapUv:I0&&L(M.specularColorMap.channel),specularIntensityMapUv:C0&&L(M.specularIntensityMap.channel),transmissionMapUv:c0&&L(M.transmissionMap.channel),thicknessMapUv:j&&L(M.thicknessMap.channel),alphaMapUv:s&&L(M.alphaMap.channel),vertexTangents:!!d.attributes.tangent&&(HJ||vJ),vertexNormals:!!d.attributes.normal,vertexColors:M.vertexColors,vertexAlphas:M.vertexColors===!0&&!!d.attributes.color&&d.attributes.color.itemSize===4,pointsUvs:v.isPoints===!0&&!!d.attributes.uv&&(FJ||s),fog:!!S,useFog:M.fog===!0,fogExp2:!!S&&S.isFogExp2,flatShading:M.wireframe===!1&&(M.flatShading===!0||d.attributes.normal===void 0&&HJ===!1&&(M.isMeshLambertMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isMeshPhysicalMaterial)),sizeAttenuation:M.sizeAttenuation===!0,logarithmicDepthBuffer:E,reversedDepthBuffer:A0,skinning:v.isSkinnedMesh===!0,hasPositionAttribute:d.attributes.position!==void 0,morphTargets:d.morphAttributes.position!==void 0,morphNormals:d.morphAttributes.normal!==void 0,morphColors:d.morphAttributes.color!==void 0,morphTargetsCount:w0,morphTextureStride:z0,numSunLights:B.sun.length,numDirLights:B.directional.length,numPointLights:B.point.length,numSpotLights:B.spot.length,numSpotLightMaps:B.spotLightMap.length,numRectAreaLights:B.rectArea.length,numHemiLights:B.hemi.length,numSunLightShadows:B.sunShadowMap.length,numDirLightShadows:B.directionalShadowMap.length,numPointLightShadows:B.pointShadowMap.length,numSpotLightShadows:B.spotShadowMap.length,numSpotLightShadowsWithMaps:B.numSpotLightShadowsWithMaps,numLightProbes:B.numLightProbes,numLightProbeGrids:r.length,numClippingPlanes:Z.numPlanes,numClipIntersection:Z.numIntersection,dithering:M.dithering,shadowMapEnabled:J.shadowMap.enabled&&l.length>0,shadowMapType:J.shadowMap.type,toneMapping:N0,decodeVideoTexture:FJ&&M.map.isVideoTexture===!0&&m0.getTransfer(M.map.colorSpace)===JJ,decodeVideoTextureEmissive:DJ&&M.emissiveMap.isVideoTexture===!0&&m0.getTransfer(M.emissiveMap.colorSpace)===JJ,premultipliedAlpha:M.premultipliedAlpha,doubleSided:M.side===aJ,flipSided:M.side===bJ,useDepthPacking:M.depthPacking>=0,depthPacking:M.depthPacking||0,index0AttributeName:M.index0AttributeName,extensionClipCullDistance:t&&M.extensions.clipCullDistance===!0&&$.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(t&&M.extensions.multiDraw===!0||B0)&&$.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:$.has("KHR_parallel_shader_compile"),customProgramCacheKey:M.customProgramCacheKey()};return y0.vertexUv1s=X.has(1),y0.vertexUv2s=X.has(2),y0.vertexUv3s=X.has(3),X.clear(),y0}function D(M){let B=[];if(M.shaderID)B.push(M.shaderID);else B.push(M.customVertexShaderID),B.push(M.customFragmentShaderID);if(M.defines!==void 0)for(let l in M.defines)B.push(l),B.push(M.defines[l]);if(M.isRawShaderMaterial===!1)q(B,M),A(B,M),B.push(J.outputColorSpace);return B.push(M.customProgramCacheKey),B.join()}function q(M,B){M.push(B.precision),M.push(B.outputColorSpace),M.push(B.envMapMode),M.push(B.envMapCubeUVHeight),M.push(B.mapUv),M.push(B.alphaMapUv),M.push(B.lightMapUv),M.push(B.aoMapUv),M.push(B.bumpMapUv),M.push(B.normalMapUv),M.push(B.displacementMapUv),M.push(B.emissiveMapUv),M.push(B.metalnessMapUv),M.push(B.roughnessMapUv),M.push(B.anisotropyMapUv),M.push(B.clearcoatMapUv),M.push(B.clearcoatNormalMapUv),M.push(B.clearcoatRoughnessMapUv),M.push(B.iridescenceMapUv),M.push(B.iridescenceThicknessMapUv),M.push(B.sheenColorMapUv),M.push(B.sheenRoughnessMapUv),M.push(B.specularMapUv),M.push(B.specularColorMapUv),M.push(B.specularIntensityMapUv),M.push(B.transmissionMapUv),M.push(B.thicknessMapUv),M.push(B.combine),M.push(B.fogExp2),M.push(B.sizeAttenuation),M.push(B.morphTargetsCount),M.push(B.morphAttributeCount),M.push(B.numSunLights),M.push(B.numDirLights),M.push(B.numPointLights),M.push(B.numSpotLights),M.push(B.numSpotLightMaps),M.push(B.numHemiLights),M.push(B.numRectAreaLights),M.push(B.numSunLightShadows),M.push(B.numDirLightShadows),M.push(B.numPointLightShadows),M.push(B.numSpotLightShadows),M.push(B.numSpotLightShadowsWithMaps),M.push(B.numLightProbes),M.push(B.shadowMapType),M.push(B.toneMapping),M.push(B.numClippingPlanes),M.push(B.numClipIntersection),M.push(B.depthPacking)}function A(M,B){if(H.disableAll(),B.instancing)H.enable(0);if(B.instancingColor)H.enable(1);if(B.instancingMorph)H.enable(2);if(B.matcap)H.enable(3);if(B.envMap)H.enable(4);if(B.normalMapObjectSpace)H.enable(5);if(B.normalMapTangentSpace)H.enable(6);if(B.clearcoat)H.enable(7);if(B.iridescence)H.enable(8);if(B.alphaTest)H.enable(9);if(B.vertexColors)H.enable(10);if(B.vertexAlphas)H.enable(11);if(B.vertexUv1s)H.enable(12);if(B.vertexUv2s)H.enable(13);if(B.vertexUv3s)H.enable(14);if(B.vertexTangents)H.enable(15);if(B.anisotropy)H.enable(16);if(B.alphaHash)H.enable(17);if(B.batching)H.enable(18);if(B.dispersion)H.enable(19);if(B.retroreflection)H.enable(24);if(B.batchingColor)H.enable(20);if(B.gradientMap)H.enable(21);if(B.packedNormalMap)H.enable(22);if(B.vertexNormals)H.enable(23);if(M.push(H.mask),H.disableAll(),B.fog)H.enable(0);if(B.useFog)H.enable(1);if(B.flatShading)H.enable(2);if(B.logarithmicDepthBuffer)H.enable(3);if(B.reversedDepthBuffer)H.enable(4);if(B.skinning)H.enable(5);if(B.morphTargets)H.enable(6);if(B.morphNormals)H.enable(7);if(B.morphColors)H.enable(8);if(B.premultipliedAlpha)H.enable(9);if(B.shadowMapEnabled)H.enable(10);if(B.doubleSided)H.enable(11);if(B.flipSided)H.enable(12);if(B.useDepthPacking)H.enable(13);if(B.dithering)H.enable(14);if(B.transmission)H.enable(15);if(B.sheen)H.enable(16);if(B.opaque)H.enable(17);if(B.pointsUvs)H.enable(18);if(B.decodeVideoTexture)H.enable(19);if(B.decodeVideoTextureEmissive)H.enable(20);if(B.alphaToCoverage)H.enable(21);if(B.numLightProbeGrids>0)H.enable(22);if(B.hasPositionAttribute)H.enable(23);M.push(H.mask)}function y(M){let B=F[M.type],l;if(B){let h=R9[B];l=VK.clone(h.uniforms)}else l=M.uniforms;return l}function V(M,B){let l=N.get(B);if(l!==void 0)++l.usedTimes;else l=new oG(J,B,M,K),U.push(l),N.set(B,l);return l}function z(M){if(--M.usedTimes===0){let B=U.indexOf(M);U[B]=U[U.length-1],U.pop(),N.delete(M.cacheKey),M.destroy()}}function C(M){Y.remove(M)}function P(){Y.dispose()}return{getParameters:I,getProgramCacheKey:D,getUniforms:y,acquireProgram:V,releaseProgram:z,releaseShaderCache:C,programs:U,dispose:P}}function eG(){let J=new WeakMap;function Q(H){return J.has(H)}function $(H){let Y=J.get(H);if(Y===void 0)Y={},J.set(H,Y);return Y}function W(H){J.delete(H)}function K(H,Y,X){J.get(H)[Y]=X}function Z(){J=new WeakMap}return{has:Q,get:$,remove:W,update:K,dispose:Z}}function JN(J,Q){if(J.groupOrder!==Q.groupOrder)return J.groupOrder-Q.groupOrder;else if(J.renderOrder!==Q.renderOrder)return J.renderOrder-Q.renderOrder;else if(J.material.id!==Q.material.id)return J.material.id-Q.material.id;else if(J.materialVariant!==Q.materialVariant)return J.materialVariant-Q.materialVariant;else if(J.z!==Q.z)return J.z-Q.z;else return J.id-Q.id}function lK(J,Q){if(J.groupOrder!==Q.groupOrder)return J.groupOrder-Q.groupOrder;else if(J.renderOrder!==Q.renderOrder)return J.renderOrder-Q.renderOrder;else if(J.z!==Q.z)return Q.z-J.z;else return J.id-Q.id}function dK(){let J=[],Q=0,$=[],W=[],K=[];function Z(){Q=0,$.length=0,W.length=0,K.length=0}function H(G){let F=0;if(G.isInstancedMesh)F+=2;if(G.isSkinnedMesh)F+=1;return F}function Y(G,F,L,I,D,q){let A=J[Q];if(A===void 0)A={id:G.id,object:G,geometry:F,material:L,materialVariant:H(G),groupOrder:I,renderOrder:G.renderOrder,z:D,group:q},J[Q]=A;else A.id=G.id,A.object=G,A.geometry=F,A.material=L,A.materialVariant=H(G),A.groupOrder=I,A.renderOrder=G.renderOrder,A.z=D,A.group=q;return Q++,A}function X(G,F,L,I,D,q,A){if(A.reversedDepth===!0)D=-D;let y=Y(G,F,L,I,D,q);if(L.transmission>0)W.push(y);else if(L.transparent===!0)K.push(y);else $.push(y)}function U(G,F,L,I,D,q){let A=Y(G,F,L,I,D,q);if(L.transmission>0)W.unshift(A);else if(L.transparent===!0)K.unshift(A);else $.unshift(A)}function N(G,F){if($.length>1)$.sort(G||JN);if(W.length>1)W.sort(F||lK);if(K.length>1)K.sort(F||lK)}function E(){for(let G=Q,F=J.length;G<F;G++){let L=J[G];if(L.id===null)break;L.id=null,L.object=null,L.geometry=null,L.material=null,L.group=null}}return{opaque:$,transmissive:W,transparent:K,init:Z,push:X,unshift:U,finish:E,sort:N}}function QN(){let J=new WeakMap;function Q(W,K){let Z=J.get(W),H;if(Z===void 0)H=new dK,J.set(W,[H]);else if(K>=Z.length)H=new dK,Z.push(H);else H=Z[K];return H}function $(){J=new WeakMap}return{get:Q,dispose:$}}function $N(){let J={};return{get:function(Q){if(J[Q.id]!==void 0)return J[Q.id];let $;switch(Q.type){case"SunLight":case"DirectionalLight":$={direction:new f,color:new g0};break;case"SpotLight":$={position:new f,direction:new f,color:new g0,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":$={position:new f,color:new g0,distance:0,decay:0};break;case"HemisphereLight":$={direction:new f,skyColor:new g0,groundColor:new g0};break;case"RectAreaLight":$={color:new g0,position:new f,halfWidth:new f,halfHeight:new f};break}return J[Q.id]=$,$}}}function WN(){let J={};return{get:function(Q){if(J[Q.id]!==void 0)return J[Q.id];let $;switch(Q.type){case"SunLight":case"DirectionalLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new S0};break;case"SpotLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new S0};break;case"PointLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new S0,shadowCameraNear:1,shadowCameraFar:1000};break}return J[Q.id]=$,$}}}var KN=0;function ZN(J,Q){return(Q.castShadow?2:0)-(J.castShadow?2:0)+(Q.map?1:0)-(J.map?1:0)}function HN(J){let Q=new $N,$=WN(),W={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let U=0;U<9;U++)W.probe.push(new f);let K=new f,Z=new KJ,H=new KJ;function Y(U){let N=0,E=0,G=0;for(let v=0;v<9;v++)W.probe[v].set(0,0,0);let F=0,L=0,I=0,D=0,q=0,A=0,y=0,V=0,z=0,C=0,P=0,M=0,B=0,l=0;U.sort(ZN);for(let v=0,r=U.length;v<r;v++){let S=U[v],d=S.color,o=S.intensity,m=S.distance,Q0=null;if(S.shadow&&S.shadow.map)if(S.shadow.map.texture.format===e9)Q0=S.shadow.map.texture;else Q0=S.shadow.map.depthTexture||S.shadow.map.texture;if(S.isAmbientLight)N+=d.r*o,E+=d.g*o,G+=d.b*o;else if(S.isLightProbe){for(let c=0;c<9;c++)W.probe[c].addScaledVector(S.sh.coefficients[c],o);l++}else if(S.isSunLight){let c=Q.get(S);if(c.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let a=S.shadow,J0=$.get(S);J0.shadowIntensity=a.intensity,J0.shadowBias=a.bias,J0.shadowNormalBias=a.normalBias,J0.shadowRadius=a.radius,J0.shadowMapSize.copy(a.mapSize).multiply(a.getFrameExtents()),W.sunShadow[L]=J0,W.sunShadowMap[L]=Q0;let w0=a.getViewportCount();for(let z0=0;z0<w0;z0++)W.sunShadowMatrix[I+z0]=a.getMatrix(z0),W.sunShadowCascade[I+z0]=a._cascadeData[z0];I+=w0,L++}W.sun[F]=c,F++}else if(S.isDirectionalLight){let c=Q.get(S);if(c.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let a=S.shadow,J0=$.get(S);J0.shadowIntensity=a.intensity,J0.shadowBias=a.bias,J0.shadowNormalBias=a.normalBias,J0.shadowRadius=a.radius,J0.shadowMapSize=a.mapSize,W.directionalShadow[D]=J0,W.directionalShadowMap[D]=Q0,W.directionalShadowMatrix[D]=S.shadow.matrix,z++}W.directional[D]=c,D++}else if(S.isSpotLight){let c=Q.get(S);c.position.setFromMatrixPosition(S.matrixWorld),c.color.copy(d).multiplyScalar(o),c.distance=m,c.coneCos=Math.cos(S.angle),c.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),c.decay=S.decay,W.spot[A]=c;let a=S.shadow;if(S.map){if(W.spotLightMap[M]=S.map,M++,a.updateMatrices(S),S.castShadow)B++}if(W.spotLightMatrix[A]=a.matrix,S.castShadow){let J0=$.get(S);J0.shadowIntensity=a.intensity,J0.shadowBias=a.bias,J0.shadowNormalBias=a.normalBias,J0.shadowRadius=a.radius,J0.shadowMapSize=a.mapSize,W.spotShadow[A]=J0,W.spotShadowMap[A]=Q0,P++}A++}else if(S.isRectAreaLight){let c=Q.get(S);c.color.copy(d).multiplyScalar(o),c.halfWidth.set(S.width*0.5,0,0),c.halfHeight.set(0,S.height*0.5,0),W.rectArea[y]=c,y++}else if(S.isPointLight){let c=Q.get(S);if(c.color.copy(S.color).multiplyScalar(S.intensity),c.distance=S.distance,c.decay=S.decay,S.castShadow){let a=S.shadow,J0=$.get(S);J0.shadowIntensity=a.intensity,J0.shadowBias=a.bias,J0.shadowNormalBias=a.normalBias,J0.shadowRadius=a.radius,J0.shadowMapSize=a.mapSize,J0.shadowCameraNear=a.camera.near,J0.shadowCameraFar=a.camera.far,W.pointShadow[q]=J0,W.pointShadowMap[q]=Q0,W.pointShadowMatrix[q]=S.shadow.matrix,C++}W.point[q]=c,q++}else if(S.isHemisphereLight){let c=Q.get(S);c.skyColor.copy(S.color).multiplyScalar(o),c.groundColor.copy(S.groundColor).multiplyScalar(o),W.hemi[V]=c,V++}}if(y>0)if(J.has("OES_texture_float_linear")===!0)W.rectAreaLTC1=G0.LTC_FLOAT_1,W.rectAreaLTC2=G0.LTC_FLOAT_2;else W.rectAreaLTC1=G0.LTC_HALF_1,W.rectAreaLTC2=G0.LTC_HALF_2;W.ambient[0]=N,W.ambient[1]=E,W.ambient[2]=G;let h=W.hash;if(h.sunLength!==F||h.directionalLength!==D||h.pointLength!==q||h.spotLength!==A||h.rectAreaLength!==y||h.hemiLength!==V||h.numSunShadows!==L||h.numDirectionalShadows!==z||h.numPointShadows!==C||h.numSpotShadows!==P||h.numSpotMaps!==M||h.numLightProbes!==l)W.sun.length=F,W.directional.length=D,W.spot.length=A,W.rectArea.length=y,W.point.length=q,W.hemi.length=V,W.sunShadow.length=L,W.sunShadowMap.length=L,W.sunShadowMatrix.length=I,W.sunShadowCascade.length=I,W.directionalShadow.length=z,W.directionalShadowMap.length=z,W.directionalShadowMatrix.length=z,W.pointShadow.length=C,W.pointShadowMap.length=C,W.pointShadowMatrix.length=C,W.spotShadow.length=P,W.spotShadowMap.length=P,W.spotLightMatrix.length=P+M-B,W.spotLightMap.length=M,W.numSpotLightShadowsWithMaps=B,W.numLightProbes=l,h.sunLength=F,h.directionalLength=D,h.pointLength=q,h.spotLength=A,h.rectAreaLength=y,h.hemiLength=V,h.numSunShadows=L,h.numDirectionalShadows=z,h.numPointShadows=C,h.numSpotShadows=P,h.numSpotMaps=M,h.numLightProbes=l,W.version=KN++}function X(U,N){let E=0,G=0,F=0,L=0,I=0,D=0,q=N.matrixWorldInverse;for(let A=0,y=U.length;A<y;A++){let V=U[A];if(V.isSunLight){let z=W.sun[E];z.direction.setFromMatrixPosition(V.matrixWorld),z.direction.transformDirection(q),E++}else if(V.isDirectionalLight){let z=W.directional[G];z.direction.setFromMatrixPosition(V.matrixWorld),K.setFromMatrixPosition(V.target.matrixWorld),z.direction.sub(K),z.direction.transformDirection(q),G++}else if(V.isSpotLight){let z=W.spot[L];z.position.setFromMatrixPosition(V.matrixWorld),z.position.applyMatrix4(q),z.direction.setFromMatrixPosition(V.matrixWorld),K.setFromMatrixPosition(V.target.matrixWorld),z.direction.sub(K),z.direction.transformDirection(q),L++}else if(V.isRectAreaLight){let z=W.rectArea[I];z.position.setFromMatrixPosition(V.matrixWorld),z.position.applyMatrix4(q),H.identity(),Z.copy(V.matrixWorld),Z.premultiply(q),H.extractRotation(Z),z.halfWidth.set(V.width*0.5,0,0),z.halfHeight.set(0,V.height*0.5,0),z.halfWidth.applyMatrix4(H),z.halfHeight.applyMatrix4(H),I++}else if(V.isPointLight){let z=W.point[F];z.position.setFromMatrixPosition(V.matrixWorld),z.position.applyMatrix4(q),F++}else if(V.isHemisphereLight){let z=W.hemi[D];z.direction.setFromMatrixPosition(V.matrixWorld),z.direction.transformDirection(q),D++}}}return{setup:Y,setupView:X,state:W}}function uK(J){let Q=new HN(J),$=[],W=[],K=[];function Z(G){E.camera=G,$.length=0,W.length=0,K.length=0}function H(G){$.push(G)}function Y(G){W.push(G)}function X(G){K.push(G)}function U(){Q.setup($)}function N(G){Q.setupView($,G)}let E={lightsArray:$,shadowsArray:W,lightProbeGridArray:K,camera:null,lights:Q,transmissionRenderTarget:{},textureUnits:0};return{init:Z,state:E,setupLights:U,setupLightsView:N,pushLight:H,pushShadow:Y,pushLightProbeGrid:X}}function YN(J){let Q=new WeakMap;function $(K,Z=0){let H=Q.get(K),Y;if(H===void 0)Y=new uK(J),Q.set(K,[Y]);else if(Z>=H.length)Y=new uK(J),H.push(Y);else Y=H[Z];return Y}function W(){Q=new WeakMap}return{get:$,dispose:W}}var XN=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,UN=`uniform sampler2D shadow_pass;
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
}`,GN=[new f(1,0,0),new f(-1,0,0),new f(0,1,0),new f(0,-1,0),new f(0,0,1),new f(0,0,-1)],NN=[new f(0,-1,0),new f(0,-1,0),new f(0,0,1),new f(0,0,-1),new f(0,-1,0),new f(0,-1,0)],cK=new KJ,D7=new f,V$=new f;function qN(J,Q,$){let W=new K6,K=new S0,Z=new S0,H=new UJ,Y=new tQ,X=new eQ,U={},N=$.maxTextureSize,E={[f8]:bJ,[bJ]:f8,[aJ]:aJ},G=new SJ({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new S0},radius:{value:4}},vertexShader:XN,fragmentShader:UN}),F=G.clone();F.defines.HORIZONTAL_PASS=1;let L=new gJ;L.setAttribute("position",new W9(new Float32Array([-1,-1,0.5,3,-1,0.5,-1,3,0.5]),3));let I=new zJ(L,G),D=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=W7;let q=this.type;this.render=function(C,P,M){if(D.enabled===!1)return;if(D.autoUpdate===!1&&D.needsUpdate===!1)return;if(C.length===0)return;if(this.type===VW)P0("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=W7;let B=J.getRenderTarget(),l=J.getActiveCubeFace(),h=J.getActiveMipmapLevel(),v=J.state;if(v.setBlending(q9),v.buffers.depth.getReversed()===!0)v.buffers.color.setClear(0,0,0,0);else v.buffers.color.setClear(1,1,1,1);v.buffers.depth.setTest(!0),v.setScissorTest(!1);let r=q!==this.type;if(r)P.traverse(function(S){if(S.material)if(Array.isArray(S.material))S.material.forEach((d)=>d.needsUpdate=!0);else S.material.needsUpdate=!0});for(let S=0,d=C.length;S<d;S++){let o=C[S],m=o.shadow;if(m===void 0){P0("WebGLShadowMap:",o,"has no shadow.");continue}if(m.autoUpdate===!1&&m.needsUpdate===!1)continue;K.copy(m.mapSize);let Q0=m.getFrameExtents();if(K.multiply(Q0),Z.copy(m.mapSize),K.x>N||K.y>N){if(K.x>N)Z.x=Math.floor(N/Q0.x),K.x=Z.x*Q0.x,m.mapSize.x=Z.x;if(K.y>N)Z.y=Math.floor(N/Q0.y),K.y=Z.y*Q0.y,m.mapSize.y=Z.y}let c=J.state.buffers.depth.getReversed();if(m.camera._reversedDepth=c,m.map===null||r===!0){if(m.map!==null){if(m.map.depthTexture!==null)m.map.depthTexture.dispose(),m.map.depthTexture=null;m.map.dispose()}if(this.type===y8){if(o.isPointLight){P0("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}m.map=new cJ(K.x,K.y,{format:e9,type:E9,minFilter:xJ,magFilter:xJ,generateMipmaps:!1}),m.map.texture.name=o.name+".shadowMap",m.map.depthTexture=new $8(K.x,K.y,C9),m.map.depthTexture.name=o.name+".shadowMapDepth",m.map.depthTexture.format=r9,m.map.depthTexture.compareFunction=null,m.map.depthTexture.minFilter=g9,m.map.depthTexture.magFilter=g9}else{if(o.isPointLight)m.map=new A$(K.x),m.map.depthTexture=new oQ(K.x,p9);else m.map=new cJ(K.x,K.y),m.map.depthTexture=new $8(K.x,K.y,p9);if(m.map.depthTexture.name=o.name+".shadowMap",m.map.depthTexture.format=r9,this.type===W7)m.map.depthTexture.compareFunction=c?e7:t7,m.map.depthTexture.minFilter=xJ,m.map.depthTexture.magFilter=xJ;else m.map.depthTexture.compareFunction=null,m.map.depthTexture.minFilter=g9,m.map.depthTexture.magFilter=g9}m.camera.updateProjectionMatrix()}if(m.map.isWebGLCubeRenderTarget!==!0&&(m.map.width!==K.x||m.map.height!==K.y))m.map.setSize(K.x,K.y);let a=m.map.isWebGLCubeRenderTarget?6:m.getViewportCount();if(o.isPointLight!==!0)m.updateMatrices(o,M);for(let J0=0;J0<a;J0++){let w0=m.getCamera(J0);if(o.isPointLight){let{camera:z0,matrix:QJ}=m,v0=o.distance||z0.far;if(v0!==z0.far)z0.far=v0,z0.updateProjectionMatrix();D7.setFromMatrixPosition(o.matrixWorld),z0.position.copy(D7),V$.copy(z0.position),V$.add(GN[J0]),z0.up.copy(NN[J0]),z0.lookAt(V$),z0.updateMatrixWorld(),QJ.makeTranslation(-D7.x,-D7.y,-D7.z),cK.multiplyMatrices(z0.projectionMatrix,z0.matrixWorldInverse),m._frustum.setFromProjectionMatrix(cK,z0.coordinateSystem,z0.reversedDepth)}if(m.map.isWebGLCubeRenderTarget)J.setRenderTarget(m.map,J0),J.clear();else{if(J0===0)J.setRenderTarget(m.map),J.clear();let z0=m.getViewport(J0);H.set(Z.x*z0.x,Z.y*z0.y,Z.x*z0.z,Z.y*z0.w),v.viewport(H)}W=m.getFrustum(J0),V(P,M,w0,o,this.type)}if(m.isPointLightShadow!==!0&&this.type===y8)A(m,M);m.needsUpdate=!1}q=this.type,D.needsUpdate=!1,J.setRenderTarget(B,l,h)};function A(C,P){let M=Q.update(I);if(G.defines.VSM_SAMPLES!==C.blurSamples)G.defines.VSM_SAMPLES=C.blurSamples,F.defines.VSM_SAMPLES=C.blurSamples,G.needsUpdate=!0,F.needsUpdate=!0;if(C.mapPass===null)C.mapPass=new cJ(K.x,K.y,{format:e9,type:E9});else if(C.mapPass.width!==C.map.width||C.mapPass.height!==C.map.height)C.mapPass.setSize(C.map.width,C.map.height);G.uniforms.shadow_pass.value=C.map.depthTexture,G.uniforms.resolution.value.set(C.map.width,C.map.height),G.uniforms.radius.value=C.radius,J.setRenderTarget(C.mapPass),J.clear(),J.renderBufferDirect(P,null,M,G,I,null),F.uniforms.shadow_pass.value=C.mapPass.texture,F.uniforms.resolution.value.set(C.map.width,C.map.height),F.uniforms.radius.value=C.radius,J.setRenderTarget(C.map),J.clear(),J.renderBufferDirect(P,null,M,F,I,null)}function y(C,P,M,B){let l=null,h=M.isPointLight===!0?C.customDistanceMaterial:C.customDepthMaterial;if(h!==void 0)l=h;else if(l=M.isPointLight===!0?X:Y,J.localClippingEnabled&&P.clipShadows===!0&&Array.isArray(P.clippingPlanes)&&P.clippingPlanes.length!==0||P.displacementMap&&P.displacementScale!==0||P.alphaMap&&P.alphaTest>0||P.map&&P.alphaTest>0||P.alphaToCoverage===!0){let v=l.uuid,r=P.uuid,S=U[v];if(S===void 0)S={},U[v]=S;let d=S[r];if(d===void 0)d=l.clone(),S[r]=d,P.addEventListener("dispose",z);l=d}if(l.visible=P.visible,l.wireframe=P.wireframe,B===y8)l.side=P.shadowSide!==null?P.shadowSide:P.side;else l.side=P.shadowSide!==null?P.shadowSide:E[P.side];if(l.alphaMap=P.alphaMap,l.alphaTest=P.alphaToCoverage===!0?0.5:P.alphaTest,l.map=P.map,l.clipShadows=P.clipShadows,l.clippingPlanes=P.clippingPlanes,l.clipIntersection=P.clipIntersection,l.displacementMap=P.displacementMap,l.displacementScale=P.displacementScale,l.displacementBias=P.displacementBias,l.wireframeLinewidth=P.wireframeLinewidth,l.linewidth=P.linewidth,M.isPointLight===!0&&l.isMeshDistanceMaterial===!0){let v=J.properties.get(l);v.light=M}return l}function V(C,P,M,B,l){if(C.visible===!1)return;if(C.layers.test(P.layers)&&(C.isMesh||C.isLine||C.isPoints)){if((C.castShadow||C.receiveShadow&&l===y8)&&(!C.frustumCulled||C.intersectsFrustum(W))){C.modelViewMatrix.multiplyMatrices(M.matrixWorldInverse,C.matrixWorld);let r=Q.update(C),S=C.material;if(Array.isArray(S)){let d=r.groups;for(let o=0,m=d.length;o<m;o++){let Q0=d[o],c=S[Q0.materialIndex];if(c&&c.visible){let a=y(C,c,B,l);C.onBeforeShadow(J,C,P,M,r,a,Q0),J.renderBufferDirect(M,null,r,a,C,Q0),C.onAfterShadow(J,C,P,M,r,a,Q0)}}}else if(S.visible){let d=y(C,S,B,l);C.onBeforeShadow(J,C,P,M,r,d,null),J.renderBufferDirect(M,null,r,d,C,null),C.onAfterShadow(J,C,P,M,r,d,null)}}}let v=C.children;for(let r=0,S=v.length;r<S;r++)V(v[r],P,M,B,l)}function z(C){C.target.removeEventListener("dispose",z);for(let M in U){let B=U[M],l=C.target.uuid;if(l in B)B[l].dispose(),delete B[l]}}}function EN(J,Q){function $(){let j=!1,H0=new UJ,s=null,Y0=new UJ(0,0,0,0);return{setMask:function(D0){if(s!==D0&&!j)J.colorMask(D0,D0,D0,D0),s=D0},setLocked:function(D0){j=D0},setClear:function(D0,t,N0,y0,$J){if($J===!0)D0*=y0,t*=y0,N0*=y0;if(H0.set(D0,t,N0,y0),Y0.equals(H0)===!1)J.clearColor(D0,t,N0,y0),Y0.copy(H0)},reset:function(){j=!1,s=null,Y0.set(-1,0,0,0)}}}function W(){let j=!1,H0=!1,s=null,Y0=null,D0=null;return{setReversed:function(t){if(H0!==t){let N0=Q.get("EXT_clip_control");if(t)N0.clipControlEXT(N0.LOWER_LEFT_EXT,N0.ZERO_TO_ONE_EXT);else N0.clipControlEXT(N0.LOWER_LEFT_EXT,N0.NEGATIVE_ONE_TO_ONE_EXT);H0=t;let y0=D0;D0=null,this.setClear(y0)}},getReversed:function(){return H0},setTest:function(t){if(t)K0(J.DEPTH_TEST);else A0(J.DEPTH_TEST)},setMask:function(t){if(s!==t&&!j)J.depthMask(t),s=t},setFunc:function(t){if(H0)t=LK[t];if(Y0!==t){switch(t){case lW:J.depthFunc(J.NEVER);break;case dW:J.depthFunc(J.ALWAYS);break;case uW:J.depthFunc(J.LESS);break;case s6:J.depthFunc(J.LEQUAL);break;case cW:J.depthFunc(J.EQUAL);break;case nW:J.depthFunc(J.GEQUAL);break;case sW:J.depthFunc(J.GREATER);break;case iW:J.depthFunc(J.NOTEQUAL);break;default:J.depthFunc(J.LEQUAL)}Y0=t}},setLocked:function(t){j=t},setClear:function(t){if(D0!==t){if(D0=t,H0)t=1-t;J.clearDepth(t)}},reset:function(){j=!1,s=null,Y0=null,D0=null,H0=!1}}}function K(){let j=!1,H0=null,s=null,Y0=null,D0=null,t=null,N0=null,y0=null,$J=null;return{setTest:function(s0){if(!j)if(s0)K0(J.STENCIL_TEST);else A0(J.STENCIL_TEST)},setMask:function(s0){if(H0!==s0&&!j)J.stencilMask(s0),H0=s0},setFunc:function(s0,U9,L9){if(s!==s0||Y0!==U9||D0!==L9)J.stencilFunc(s0,U9,L9),s=s0,Y0=U9,D0=L9},setOp:function(s0,U9,L9){if(t!==s0||N0!==U9||y0!==L9)J.stencilOp(s0,U9,L9),t=s0,N0=U9,y0=L9},setLocked:function(s0){j=s0},setClear:function(s0){if($J!==s0)J.clearStencil(s0),$J=s0},reset:function(){j=!1,H0=null,s=null,Y0=null,D0=null,t=null,N0=null,y0=null,$J=null}}}let Z=new $,H=new W,Y=new K,X=new WeakMap,U=new WeakMap,N={},E={},G={},F=new WeakMap,L=[],I=null,D=!1,q=null,A=null,y=null,V=null,z=null,C=null,P=null,M=new g0(0,0,0),B=0,l=!1,h=null,v=null,r=null,S=null,d=null,o=J.getParameter(J.MAX_COMBINED_TEXTURE_IMAGE_UNITS),m=!1,Q0=0,c=J.getParameter(J.VERSION);if(c.indexOf("WebGL")!==-1)Q0=parseFloat(/^WebGL (\d)/.exec(c)[1]),m=Q0>=1;else if(c.indexOf("OpenGL ES")!==-1)Q0=parseFloat(/^OpenGL ES (\d)/.exec(c)[1]),m=Q0>=2;let a=null,J0={},w0=J.getParameter(J.SCISSOR_BOX),z0=J.getParameter(J.VIEWPORT),QJ=new UJ().fromArray(w0),v0=new UJ().fromArray(z0);function n(j,H0,s,Y0){let D0=new Uint8Array(4),t=J.createTexture();J.bindTexture(j,t),J.texParameteri(j,J.TEXTURE_MIN_FILTER,J.NEAREST),J.texParameteri(j,J.TEXTURE_MAG_FILTER,J.NEAREST);for(let N0=0;N0<s;N0++)if(j===J.TEXTURE_3D||j===J.TEXTURE_2D_ARRAY)J.texImage3D(H0,0,J.RGBA,1,1,Y0,0,J.RGBA,J.UNSIGNED_BYTE,D0);else J.texImage2D(H0+N0,0,J.RGBA,1,1,0,J.RGBA,J.UNSIGNED_BYTE,D0);return t}let $0={};$0[J.TEXTURE_2D]=n(J.TEXTURE_2D,J.TEXTURE_2D,1),$0[J.TEXTURE_CUBE_MAP]=n(J.TEXTURE_CUBE_MAP,J.TEXTURE_CUBE_MAP_POSITIVE_X,6),$0[J.TEXTURE_2D_ARRAY]=n(J.TEXTURE_2D_ARRAY,J.TEXTURE_2D_ARRAY,1,1),$0[J.TEXTURE_3D]=n(J.TEXTURE_3D,J.TEXTURE_3D,1,1),Z.setClear(0,0,0,1),H.setClear(1),Y.setClear(0),K0(J.DEPTH_TEST),H.setFunc(s6),BJ(!1),HJ(d6),K0(J.CULL_FACE),o0(q9);function K0(j){if(N[j]!==!0)J.enable(j),N[j]=!0}function A0(j){if(N[j]!==!1)J.disable(j),N[j]=!1}function _0(j,H0){if(G[j]!==H0){if(J.bindFramebuffer(j,H0),G[j]=H0,j===J.DRAW_FRAMEBUFFER)G[J.FRAMEBUFFER]=H0;if(j===J.FRAMEBUFFER)G[J.DRAW_FRAMEBUFFER]=H0;return!0}return!1}function B0(j,H0){let s=L,Y0=!1;if(j){if(s=F.get(H0),s===void 0)s=[],F.set(H0,s);let D0=j.textures;if(s.length!==D0.length||s[0]!==J.COLOR_ATTACHMENT0){for(let t=0,N0=D0.length;t<N0;t++)s[t]=J.COLOR_ATTACHMENT0+t;s.length=D0.length,Y0=!0}}else if(s[0]!==J.BACK)s[0]=J.BACK,Y0=!0;if(Y0)J.drawBuffers(s)}function FJ(j){if(I!==j)return J.useProgram(j),I=j,!0;return!1}let p0={[h8]:J.FUNC_ADD,[IW]:J.FUNC_SUBTRACT,[zW]:J.FUNC_REVERSE_SUBTRACT};p0[AW]=J.MIN,p0[CW]=J.MAX;let l0={[PW]:J.ZERO,[wW]:J.ONE,[_W]:J.SRC_COLOR,[SW]:J.SRC_ALPHA,[bW]:J.SRC_ALPHA_SATURATE,[hW]:J.DST_COLOR,[yW]:J.DST_ALPHA,[TW]:J.ONE_MINUS_SRC_COLOR,[jW]:J.ONE_MINUS_SRC_ALPHA,[vW]:J.ONE_MINUS_DST_COLOR,[fW]:J.ONE_MINUS_DST_ALPHA,[xW]:J.CONSTANT_COLOR,[gW]:J.ONE_MINUS_CONSTANT_COLOR,[pW]:J.CONSTANT_ALPHA,[mW]:J.ONE_MINUS_CONSTANT_ALPHA};function o0(j,H0,s,Y0,D0,t,N0,y0,$J,s0){if(j===q9){if(D===!0)A0(J.BLEND),D=!1;return}if(D===!1)K0(J.BLEND),D=!0;if(j!==BW){if(j!==q||s0!==l){if(A!==h8||z!==h8)J.blendEquation(J.FUNC_ADD),A=h8,z=h8;if(s0)switch(j){case K7:J.blendFuncSeparate(J.ONE,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case u6:J.blendFunc(J.ONE,J.ONE);break;case c6:J.blendFuncSeparate(J.ZERO,J.ONE_MINUS_SRC_COLOR,J.ZERO,J.ONE);break;case n6:J.blendFuncSeparate(J.DST_COLOR,J.ONE_MINUS_SRC_ALPHA,J.ZERO,J.ONE);break;default:T0("WebGLState: Invalid blending: ",j);break}else switch(j){case K7:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case u6:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE,J.ONE,J.ONE);break;case c6:T0("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case n6:T0("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:T0("WebGLState: Invalid blending: ",j);break}y=null,V=null,C=null,P=null,M.set(0,0,0),B=0,q=j,l=s0}return}if(D0=D0||H0,t=t||s,N0=N0||Y0,H0!==A||D0!==z)J.blendEquationSeparate(p0[H0],p0[D0]),A=H0,z=D0;if(s!==y||Y0!==V||t!==C||N0!==P)J.blendFuncSeparate(l0[s],l0[Y0],l0[t],l0[N0]),y=s,V=Y0,C=t,P=N0;if(y0.equals(M)===!1||$J!==B)J.blendColor(y0.r,y0.g,y0.b,$J),M.copy(y0),B=$J;q=j,l=!1}function d0(j,H0){j.side===aJ?A0(J.CULL_FACE):K0(J.CULL_FACE);let s=j.side===bJ;if(H0)s=!s;BJ(s),j.blending===K7&&j.transparent===!1?o0(q9):o0(j.blending,j.blendEquation,j.blendSrc,j.blendDst,j.blendEquationAlpha,j.blendSrcAlpha,j.blendDstAlpha,j.blendColor,j.blendAlpha,j.premultipliedAlpha),H.setFunc(j.depthFunc),H.setTest(j.depthTest),H.setMask(j.depthWrite),Z.setMask(j.colorWrite);let Y0=j.stencilWrite;if(Y.setTest(Y0),Y0)Y.setMask(j.stencilWriteMask),Y.setFunc(j.stencilFunc,j.stencilRef,j.stencilFuncMask),Y.setOp(j.stencilFail,j.stencilZFail,j.stencilZPass);DJ(j.polygonOffset,j.polygonOffsetFactor,j.polygonOffsetUnits),j.alphaToCoverage===!0?K0(J.SAMPLE_ALPHA_TO_COVERAGE):A0(J.SAMPLE_ALPHA_TO_COVERAGE)}function BJ(j){if(h!==j){if(j)J.frontFace(J.CW);else J.frontFace(J.CCW);h=j}}function HJ(j){if(j!==LW){if(K0(J.CULL_FACE),j!==v)if(j===d6)J.cullFace(J.BACK);else if(j===kW)J.cullFace(J.FRONT);else J.cullFace(J.FRONT_AND_BACK)}else A0(J.CULL_FACE);v=j}function hJ(j){if(j!==r){if(m)J.lineWidth(j);r=j}}function DJ(j,H0,s){if(j){if(K0(J.POLYGON_OFFSET_FILL),S!==H0||d!==s){if(S=H0,d=s,H.getReversed())H0=-H0;J.polygonOffset(H0,s)}}else A0(J.POLYGON_OFFSET_FILL)}function OJ(j){if(j)K0(J.SCISSOR_TEST);else A0(J.SCISSOR_TEST)}function _(j){if(j===void 0)j=J.TEXTURE0+o-1;if(a!==j)J.activeTexture(j),a=j}function vJ(j,H0,s){if(s===void 0)if(a===null)s=J.TEXTURE0+o-1;else s=a;let Y0=J0[s];if(Y0===void 0)Y0={type:void 0,texture:void 0},J0[s]=Y0;if(Y0.type!==j||Y0.texture!==H0){if(a!==s)J.activeTexture(s),a=s;J.bindTexture(j,H0||$0[j]),Y0.type=j,Y0.texture=H0}}function n0(){let j=J0[a];if(j!==void 0&&j.type!==void 0)J.bindTexture(j.type,null),j.type=void 0,j.texture=void 0}function XJ(){try{J.compressedTexImage2D(...arguments)}catch(j){T0("WebGLState:",j)}}function k(){try{J.compressedTexImage3D(...arguments)}catch(j){T0("WebGLState:",j)}}function O(){try{J.texSubImage2D(...arguments)}catch(j){T0("WebGLState:",j)}}function w(){try{J.texSubImage3D(...arguments)}catch(j){T0("WebGLState:",j)}}function g(){try{J.compressedTexSubImage2D(...arguments)}catch(j){T0("WebGLState:",j)}}function e(){try{J.compressedTexSubImage3D(...arguments)}catch(j){T0("WebGLState:",j)}}function Z0(){try{J.texStorage2D(...arguments)}catch(j){T0("WebGLState:",j)}}function X0(){try{J.texStorage3D(...arguments)}catch(j){T0("WebGLState:",j)}}function u(){try{J.texImage2D(...arguments)}catch(j){T0("WebGLState:",j)}}function i(){try{J.texImage3D(...arguments)}catch(j){T0("WebGLState:",j)}}function F0(j){if(E[j]!==void 0)return E[j];else return J.getParameter(j)}function V0(j,H0){if(E[j]!==H0)J.pixelStorei(j,H0),E[j]=H0}function U0(j){if(QJ.equals(j)===!1)J.scissor(j.x,j.y,j.z,j.w),QJ.copy(j)}function W0(j){if(v0.equals(j)===!1)J.viewport(j.x,j.y,j.z,j.w),v0.copy(j)}function I0(j,H0){let s=U.get(H0);if(s===void 0)s=new WeakMap,U.set(H0,s);let Y0=s.get(j);if(Y0===void 0)Y0=J.getUniformBlockIndex(H0,j.name),s.set(j,Y0)}function C0(j,H0){let Y0=U.get(H0).get(j);if(X.get(H0)!==Y0)J.uniformBlockBinding(H0,Y0,j.__bindingPointIndex),X.set(H0,Y0)}function c0(){J.disable(J.BLEND),J.disable(J.CULL_FACE),J.disable(J.DEPTH_TEST),J.disable(J.POLYGON_OFFSET_FILL),J.disable(J.SCISSOR_TEST),J.disable(J.STENCIL_TEST),J.disable(J.SAMPLE_ALPHA_TO_COVERAGE),J.blendEquation(J.FUNC_ADD),J.blendFunc(J.ONE,J.ZERO),J.blendFuncSeparate(J.ONE,J.ZERO,J.ONE,J.ZERO),J.blendColor(0,0,0,0),J.colorMask(!0,!0,!0,!0),J.clearColor(0,0,0,0),J.depthMask(!0),J.depthFunc(J.LESS),H.setReversed(!1),J.clearDepth(1),J.stencilMask(4294967295),J.stencilFunc(J.ALWAYS,0,4294967295),J.stencilOp(J.KEEP,J.KEEP,J.KEEP),J.clearStencil(0),J.cullFace(J.BACK),J.frontFace(J.CCW),J.polygonOffset(0,0),J.activeTexture(J.TEXTURE0),J.bindFramebuffer(J.FRAMEBUFFER,null),J.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),J.bindFramebuffer(J.READ_FRAMEBUFFER,null),J.useProgram(null),J.lineWidth(1),J.scissor(0,0,J.canvas.width,J.canvas.height),J.viewport(0,0,J.canvas.width,J.canvas.height),J.pixelStorei(J.PACK_ALIGNMENT,4),J.pixelStorei(J.UNPACK_ALIGNMENT,4),J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,!1),J.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),J.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,J.BROWSER_DEFAULT_WEBGL),J.pixelStorei(J.PACK_ROW_LENGTH,0),J.pixelStorei(J.PACK_SKIP_PIXELS,0),J.pixelStorei(J.PACK_SKIP_ROWS,0),J.pixelStorei(J.UNPACK_ROW_LENGTH,0),J.pixelStorei(J.UNPACK_IMAGE_HEIGHT,0),J.pixelStorei(J.UNPACK_SKIP_PIXELS,0),J.pixelStorei(J.UNPACK_SKIP_ROWS,0),J.pixelStorei(J.UNPACK_SKIP_IMAGES,0),N={},E={},a=null,J0={},G={},F=new WeakMap,L=[],I=null,D=!1,q=null,A=null,y=null,V=null,z=null,C=null,P=null,M=new g0(0,0,0),B=0,l=!1,h=null,v=null,r=null,S=null,d=null,QJ.set(0,0,J.canvas.width,J.canvas.height),v0.set(0,0,J.canvas.width,J.canvas.height),Z.reset(),H.reset(),Y.reset()}return{buffers:{color:Z,depth:H,stencil:Y},enable:K0,disable:A0,bindFramebuffer:_0,drawBuffers:B0,useProgram:FJ,setBlending:o0,setMaterial:d0,setFlipSided:BJ,setCullFace:HJ,setLineWidth:hJ,setPolygonOffset:DJ,setScissorTest:OJ,activeTexture:_,bindTexture:vJ,unbindTexture:n0,compressedTexImage2D:XJ,compressedTexImage3D:k,texImage2D:u,texImage3D:i,pixelStorei:V0,getParameter:F0,updateUBOMapping:I0,uniformBlockBinding:C0,texStorage2D:Z0,texStorage3D:X0,texSubImage2D:O,texSubImage3D:w,compressedTexSubImage2D:g,compressedTexSubImage3D:e,scissor:U0,viewport:W0,reset:c0}}function FN(J,Q,$,W,K,Z,H){let Y=Q.has("WEBGL_multisampled_render_to_texture")?Q.get("WEBGL_multisampled_render_to_texture"):null,X=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),U=new S0,N=new WeakMap,E=new Set,G,F=new WeakMap,L=!1;try{L=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(k){}function I(k,O){return L?new OffscreenCanvas(k,O):$7("canvas")}function D(k,O,w){let g=1,e=XJ(k);if(e.width>w||e.height>w)g=w/Math.max(e.width,e.height);if(g<1)if(typeof HTMLImageElement<"u"&&k instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&k instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&k instanceof ImageBitmap||typeof VideoFrame<"u"&&k instanceof VideoFrame){let Z0=Math.floor(g*e.width),X0=Math.floor(g*e.height);if(G===void 0)G=I(Z0,X0);let u=O?I(Z0,X0):G;return u.width=Z0,u.height=X0,u.getContext("2d").drawImage(k,0,0,Z0,X0),P0("WebGLRenderer: Texture has been resized from ("+e.width+"x"+e.height+") to ("+Z0+"x"+X0+")."),u}else{if("data"in k)P0("WebGLRenderer: Image in DataTexture is too big ("+e.width+"x"+e.height+").");return k}return k}function q(k){return k.generateMipmaps}function A(k){J.generateMipmap(k)}function y(k){if(k.isWebGLCubeRenderTarget)return J.TEXTURE_CUBE_MAP;if(k.isWebGL3DRenderTarget)return J.TEXTURE_3D;if(k.isWebGLArrayRenderTarget||k.isCompressedArrayTexture)return J.TEXTURE_2D_ARRAY;return J.TEXTURE_2D}function V(k,O,w,g,e,Z0=!1){if(k!==null){if(J[k]!==void 0)return J[k];P0("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+k+"'")}let X0;if(g){if(X0=Q.get("EXT_texture_norm16"),!X0)P0("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension")}let u=O;if(O===J.RED){if(w===J.FLOAT)u=J.R32F;if(w===J.HALF_FLOAT)u=J.R16F;if(w===J.UNSIGNED_BYTE)u=J.R8;if(w===J.UNSIGNED_SHORT&&X0)u=X0.R16_EXT;if(w===J.SHORT&&X0)u=X0.R16_SNORM_EXT}if(O===J.RED_INTEGER){if(w===J.UNSIGNED_BYTE)u=J.R8UI;if(w===J.UNSIGNED_SHORT)u=J.R16UI;if(w===J.UNSIGNED_INT)u=J.R32UI;if(w===J.BYTE)u=J.R8I;if(w===J.SHORT)u=J.R16I;if(w===J.INT)u=J.R32I}if(O===J.RG){if(w===J.FLOAT)u=J.RG32F;if(w===J.HALF_FLOAT)u=J.RG16F;if(w===J.UNSIGNED_BYTE)u=J.RG8;if(w===J.UNSIGNED_SHORT&&X0)u=X0.RG16_EXT;if(w===J.SHORT&&X0)u=X0.RG16_SNORM_EXT}if(O===J.RG_INTEGER){if(w===J.UNSIGNED_BYTE)u=J.RG8UI;if(w===J.UNSIGNED_SHORT)u=J.RG16UI;if(w===J.UNSIGNED_INT)u=J.RG32UI;if(w===J.BYTE)u=J.RG8I;if(w===J.SHORT)u=J.RG16I;if(w===J.INT)u=J.RG32I}if(O===J.RGB_INTEGER){if(w===J.UNSIGNED_BYTE)u=J.RGB8UI;if(w===J.UNSIGNED_SHORT)u=J.RGB16UI;if(w===J.UNSIGNED_INT)u=J.RGB32UI;if(w===J.BYTE)u=J.RGB8I;if(w===J.SHORT)u=J.RGB16I;if(w===J.INT)u=J.RGB32I}if(O===J.RGBA_INTEGER){if(w===J.UNSIGNED_BYTE)u=J.RGBA8UI;if(w===J.UNSIGNED_SHORT)u=J.RGBA16UI;if(w===J.UNSIGNED_INT)u=J.RGBA32UI;if(w===J.BYTE)u=J.RGBA8I;if(w===J.SHORT)u=J.RGBA16I;if(w===J.INT)u=J.RGBA32I}if(O===J.RGB){if(w===J.UNSIGNED_SHORT&&X0)u=X0.RGB16_EXT;if(w===J.SHORT&&X0)u=X0.RGB16_SNORM_EXT;if(w===J.UNSIGNED_INT_5_9_9_9_REV)u=J.RGB9_E5;if(w===J.UNSIGNED_INT_10F_11F_11F_REV)u=J.R11F_G11F_B10F}if(O===J.RGBA){let i=Z0?gQ:m0.getTransfer(e);if(w===J.FLOAT)u=J.RGBA32F;if(w===J.HALF_FLOAT)u=J.RGBA16F;if(w===J.UNSIGNED_BYTE)u=i===JJ?J.SRGB8_ALPHA8:J.RGBA8;if(w===J.UNSIGNED_SHORT&&X0)u=X0.RGBA16_EXT;if(w===J.SHORT&&X0)u=X0.RGBA16_SNORM_EXT;if(w===J.UNSIGNED_SHORT_4_4_4_4)u=J.RGBA4;if(w===J.UNSIGNED_SHORT_5_5_5_1)u=J.RGB5_A1}if(u===J.R16F||u===J.R32F||u===J.RG16F||u===J.RG32F||u===J.RGBA16F||u===J.RGBA32F)Q.get("EXT_color_buffer_float");return u}function z(k,O){let w;if(k){if(O===null||O===p9||O===b8)w=J.DEPTH24_STENCIL8;else if(O===C9)w=J.DEPTH32F_STENCIL8;else if(O===Y7)w=J.DEPTH24_STENCIL8,P0("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")}else if(O===null||O===p9||O===b8)w=J.DEPTH_COMPONENT24;else if(O===C9)w=J.DEPTH_COMPONENT32F;else if(O===Y7)w=J.DEPTH_COMPONENT16;return w}function C(k,O){if(q(k)===!0||k.isFramebufferTexture&&k.minFilter!==g9&&k.minFilter!==xJ)return Math.log2(Math.max(O.width,O.height))+1;else if(k.mipmaps!==void 0&&k.mipmaps.length>0)return k.mipmaps.length;else if(k.isCompressedTexture&&Array.isArray(k.image))return O.mipmaps.length;else return 1}function P(k){let O=k.target;if(O.removeEventListener("dispose",P),B(O),O.isVideoTexture)N.delete(O);if(O.isHTMLTexture)E.delete(O)}function M(k){let O=k.target;O.removeEventListener("dispose",M),h(O)}function B(k){let O=W.get(k);if(O.__webglInit===void 0)return;let w=k.source,g=F.get(w);if(g){let e=g[O.__cacheKey];if(e.usedTimes--,e.usedTimes===0)l(k);if(Object.keys(g).length===0)F.delete(w)}W.remove(k)}function l(k){let O=W.get(k);J.deleteTexture(O.__webglTexture);let w=k.source,g=F.get(w);delete g[O.__cacheKey],H.memory.textures--}function h(k){let O=W.get(k);if(k.depthTexture)k.depthTexture.dispose(),W.remove(k.depthTexture);if(k.isWebGLCubeRenderTarget)for(let g=0;g<6;g++){if(Array.isArray(O.__webglFramebuffer[g]))for(let e=0;e<O.__webglFramebuffer[g].length;e++)J.deleteFramebuffer(O.__webglFramebuffer[g][e]);else J.deleteFramebuffer(O.__webglFramebuffer[g]);if(O.__webglDepthbuffer)J.deleteRenderbuffer(O.__webglDepthbuffer[g])}else{if(Array.isArray(O.__webglFramebuffer))for(let g=0;g<O.__webglFramebuffer.length;g++)J.deleteFramebuffer(O.__webglFramebuffer[g]);else J.deleteFramebuffer(O.__webglFramebuffer);if(O.__webglDepthbuffer)J.deleteRenderbuffer(O.__webglDepthbuffer);if(O.__webglMultisampledFramebuffer)J.deleteFramebuffer(O.__webglMultisampledFramebuffer);if(O.__webglColorRenderbuffer){for(let g=0;g<O.__webglColorRenderbuffer.length;g++)if(O.__webglColorRenderbuffer[g])J.deleteRenderbuffer(O.__webglColorRenderbuffer[g])}if(O.__webglDepthRenderbuffer)J.deleteRenderbuffer(O.__webglDepthRenderbuffer)}let w=k.textures;for(let g=0,e=w.length;g<e;g++){let Z0=W.get(w[g]);if(Z0.__webglTexture)J.deleteTexture(Z0.__webglTexture),H.memory.textures--;W.remove(w[g])}W.remove(k)}let v=0;function r(){v=0}function S(){return v}function d(k){v=k}function o(){let k=v;if(k>=K.maxTextures)P0("WebGLTextures: Trying to use "+(k+1)+" texture units while this GPU supports only "+K.maxTextures);return v+=1,k}function m(k){let O=[];return O.push(k.wrapS),O.push(k.wrapT),O.push(k.wrapR||0),O.push(k.magFilter),O.push(k.minFilter),O.push(k.anisotropy),O.push(k.internalFormat),O.push(k.format),O.push(k.type),O.push(k.generateMipmaps),O.push(k.premultiplyAlpha),O.push(k.flipY),O.push(k.unpackAlignment),O.push(k.colorSpace),O.join()}function Q0(k,O){let w=W.get(k);if(k.isVideoTexture)vJ(k);if(k.isRenderTargetTexture===!1&&k.isExternalTexture!==!0&&k.version>0&&w.__version!==k.version){let g=k.image;if(g===null)P0("WebGLRenderer: Texture marked for update but no image data found.");else if(g.complete===!1)P0("WebGLRenderer: Texture marked for update but image is incomplete");else{A0(w,k,O);return}}else if(k.isExternalTexture)w.__webglTexture=k.sourceTexture?k.sourceTexture:null;$.bindTexture(J.TEXTURE_2D,w.__webglTexture,J.TEXTURE0+O)}function c(k,O){let w=W.get(k);if(k.isRenderTargetTexture===!1&&k.version>0&&w.__version!==k.version){A0(w,k,O);return}else if(k.isExternalTexture)w.__webglTexture=k.sourceTexture?k.sourceTexture:null;$.bindTexture(J.TEXTURE_2D_ARRAY,w.__webglTexture,J.TEXTURE0+O)}function a(k,O){let w=W.get(k);if(k.isRenderTargetTexture===!1&&k.version>0&&w.__version!==k.version){A0(w,k,O);return}$.bindTexture(J.TEXTURE_3D,w.__webglTexture,J.TEXTURE0+O)}function J0(k,O){let w=W.get(k);if(k.isCubeDepthTexture!==!0&&k.version>0&&w.__version!==k.version){_0(w,k,O);return}$.bindTexture(J.TEXTURE_CUBE_MAP,w.__webglTexture,J.TEXTURE0+O)}let w0={[tW]:J.REPEAT,[u7]:J.CLAMP_TO_EDGE,[eW]:J.MIRRORED_REPEAT},z0={[g9]:J.NEAREST,[JK]:J.NEAREST_MIPMAP_NEAREST,[H7]:J.NEAREST_MIPMAP_LINEAR,[xJ]:J.LINEAR,[c7]:J.LINEAR_MIPMAP_NEAREST,[a9]:J.LINEAR_MIPMAP_LINEAR},QJ={[GK]:J.NEVER,[DK]:J.ALWAYS,[NK]:J.LESS,[t7]:J.LEQUAL,[qK]:J.EQUAL,[e7]:J.GEQUAL,[EK]:J.GREATER,[FK]:J.NOTEQUAL};function v0(k,O){if(O.type===C9&&Q.has("OES_texture_float_linear")===!1&&(O.magFilter===xJ||O.magFilter===c7||O.magFilter===H7||O.magFilter===a9||O.minFilter===xJ||O.minFilter===c7||O.minFilter===H7||O.minFilter===a9))P0("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");if(J.texParameteri(k,J.TEXTURE_WRAP_S,w0[O.wrapS]),J.texParameteri(k,J.TEXTURE_WRAP_T,w0[O.wrapT]),k===J.TEXTURE_3D||k===J.TEXTURE_2D_ARRAY)J.texParameteri(k,J.TEXTURE_WRAP_R,w0[O.wrapR]);if(J.texParameteri(k,J.TEXTURE_MAG_FILTER,z0[O.magFilter]),J.texParameteri(k,J.TEXTURE_MIN_FILTER,z0[O.minFilter]),O.compareFunction)J.texParameteri(k,J.TEXTURE_COMPARE_MODE,J.COMPARE_REF_TO_TEXTURE),J.texParameteri(k,J.TEXTURE_COMPARE_FUNC,QJ[O.compareFunction]);if(Q.has("EXT_texture_filter_anisotropic")===!0){if(O.magFilter===g9)return;if(O.minFilter!==H7&&O.minFilter!==a9)return;if(O.type===C9&&Q.has("OES_texture_float_linear")===!1)return;if(O.anisotropy>1||W.get(O).__currentAnisotropy){let w=Q.get("EXT_texture_filter_anisotropic");J.texParameterf(k,w.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(O.anisotropy,K.getMaxAnisotropy())),W.get(O).__currentAnisotropy=O.anisotropy}}}function n(k,O){let w=!1;if(k.__webglInit===void 0)k.__webglInit=!0,O.addEventListener("dispose",P);let g=O.source,e=F.get(g);if(e===void 0)e={},F.set(g,e);let Z0=m(O);if(Z0!==k.__cacheKey){if(e[Z0]===void 0)e[Z0]={texture:J.createTexture(),usedTimes:0},H.memory.textures++,w=!0;e[Z0].usedTimes++;let X0=e[k.__cacheKey];if(X0!==void 0){if(e[k.__cacheKey].usedTimes--,X0.usedTimes===0)l(O)}k.__cacheKey=Z0,k.__webglTexture=e[Z0].texture}return w}function $0(k,O,w){return Math.floor(Math.floor(k/w)/O)}function K0(k,O,w,g){let Z0=k.updateRanges;if(Z0.length===0)$.texSubImage2D(J.TEXTURE_2D,0,0,0,O.width,O.height,w,g,O.data);else{Z0.sort((V0,U0)=>V0.start-U0.start);let X0=0;for(let V0=1;V0<Z0.length;V0++){let U0=Z0[X0],W0=Z0[V0],I0=U0.start+U0.count,C0=$0(W0.start,O.width,4),c0=$0(U0.start,O.width,4);if(W0.start<=I0+1&&C0===c0&&$0(W0.start+W0.count-1,O.width,4)===C0)U0.count=Math.max(U0.count,W0.start+W0.count-U0.start);else++X0,Z0[X0]=W0}Z0.length=X0+1;let u=$.getParameter(J.UNPACK_ROW_LENGTH),i=$.getParameter(J.UNPACK_SKIP_PIXELS),F0=$.getParameter(J.UNPACK_SKIP_ROWS);$.pixelStorei(J.UNPACK_ROW_LENGTH,O.width);for(let V0=0,U0=Z0.length;V0<U0;V0++){let W0=Z0[V0],I0=Math.floor(W0.start/4),C0=Math.ceil(W0.count/4),c0=I0%O.width,j=Math.floor(I0/O.width),H0=C0,s=1;$.pixelStorei(J.UNPACK_SKIP_PIXELS,c0),$.pixelStorei(J.UNPACK_SKIP_ROWS,j),$.texSubImage2D(J.TEXTURE_2D,0,c0,j,H0,1,w,g,O.data)}k.clearUpdateRanges(),$.pixelStorei(J.UNPACK_ROW_LENGTH,u),$.pixelStorei(J.UNPACK_SKIP_PIXELS,i),$.pixelStorei(J.UNPACK_SKIP_ROWS,F0)}}function A0(k,O,w){let g=J.TEXTURE_2D;if(O.isDataArrayTexture||O.isCompressedArrayTexture)g=J.TEXTURE_2D_ARRAY;if(O.isData3DTexture)g=J.TEXTURE_3D;let e=n(k,O),Z0=O.source;$.bindTexture(g,k.__webglTexture,J.TEXTURE0+w);let X0=W.get(Z0);if(Z0.version!==X0.__version||e===!0){if($.activeTexture(J.TEXTURE0+w),(typeof ImageBitmap<"u"&&O.image instanceof ImageBitmap)===!1){let s=m0.getPrimaries(m0.workingColorSpace),Y0=O.colorSpace===J8?null:m0.getPrimaries(O.colorSpace),D0=O.colorSpace===J8||s===Y0?J.NONE:J.BROWSER_DEFAULT_WEBGL;$.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,O.flipY),$.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),$.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,D0)}$.pixelStorei(J.UNPACK_ALIGNMENT,O.unpackAlignment);let i=D(O.image,!1,K.maxTextureSize);i=n0(O,i);let F0=Z.convert(O.format,O.colorSpace),V0=Z.convert(O.type),U0=V(O.internalFormat,F0,V0,O.normalized,O.colorSpace,O.isVideoTexture);v0(g,O);let W0,I0=O.mipmaps,C0=O.isVideoTexture!==!0,c0=X0.__version===void 0||e===!0,j=Z0.dataReady,H0=C(O,i);if(O.isDepthTexture){if(U0=z(O.format===t9,O.type),c0)if(C0)$.texStorage2D(J.TEXTURE_2D,1,U0,i.width,i.height);else $.texImage2D(J.TEXTURE_2D,0,U0,i.width,i.height,0,F0,V0,null)}else if(O.isDataTexture)if(I0.length>0){if(C0&&c0)$.texStorage2D(J.TEXTURE_2D,H0,U0,I0[0].width,I0[0].height);for(let s=0,Y0=I0.length;s<Y0;s++)if(W0=I0[s],C0){if(j)$.texSubImage2D(J.TEXTURE_2D,s,0,0,W0.width,W0.height,F0,V0,W0.data)}else $.texImage2D(J.TEXTURE_2D,s,U0,W0.width,W0.height,0,F0,V0,W0.data);O.generateMipmaps=!1}else if(C0){if(c0)$.texStorage2D(J.TEXTURE_2D,H0,U0,i.width,i.height);if(j)K0(O,i,F0,V0)}else $.texImage2D(J.TEXTURE_2D,0,U0,i.width,i.height,0,F0,V0,i.data);else if(O.isCompressedTexture)if(O.isCompressedArrayTexture){if(C0&&c0)$.texStorage3D(J.TEXTURE_2D_ARRAY,H0,U0,I0[0].width,I0[0].height,i.depth);for(let s=0,Y0=I0.length;s<Y0;s++)if(W0=I0[s],O.format!==F9)if(F0!==null)if(C0){if(j)if(O.layerUpdates.size>0){let D0=D$(W0.width,W0.height,O.format,O.type);for(let t of O.layerUpdates){let N0=W0.data.subarray(t*D0/W0.data.BYTES_PER_ELEMENT,(t+1)*D0/W0.data.BYTES_PER_ELEMENT);$.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,s,0,0,t,W0.width,W0.height,1,F0,N0)}}else $.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,s,0,0,0,W0.width,W0.height,i.depth,F0,W0.data)}else $.compressedTexImage3D(J.TEXTURE_2D_ARRAY,s,U0,W0.width,W0.height,i.depth,0,W0.data,0,0);else P0("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(C0){if(j)$.texSubImage3D(J.TEXTURE_2D_ARRAY,s,0,0,0,W0.width,W0.height,i.depth,F0,V0,W0.data)}else $.texImage3D(J.TEXTURE_2D_ARRAY,s,U0,W0.width,W0.height,i.depth,0,F0,V0,W0.data);if(O.layerUpdates.size>0)O.clearLayerUpdates()}else{if(C0&&c0)$.texStorage2D(J.TEXTURE_2D,H0,U0,I0[0].width,I0[0].height);for(let s=0,Y0=I0.length;s<Y0;s++)if(W0=I0[s],O.format!==F9)if(F0!==null)if(C0){if(j)$.compressedTexSubImage2D(J.TEXTURE_2D,s,0,0,W0.width,W0.height,F0,W0.data)}else $.compressedTexImage2D(J.TEXTURE_2D,s,U0,W0.width,W0.height,0,W0.data);else P0("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(C0){if(j)$.texSubImage2D(J.TEXTURE_2D,s,0,0,W0.width,W0.height,F0,V0,W0.data)}else $.texImage2D(J.TEXTURE_2D,s,U0,W0.width,W0.height,0,F0,V0,W0.data)}else if(O.isDataArrayTexture)if(C0){if(c0)$.texStorage3D(J.TEXTURE_2D_ARRAY,H0,U0,i.width,i.height,i.depth);if(j)if(O.layerUpdates.size>0){let s=D$(i.width,i.height,O.format,O.type);for(let Y0 of O.layerUpdates){let D0=i.data.subarray(Y0*s/i.data.BYTES_PER_ELEMENT,(Y0+1)*s/i.data.BYTES_PER_ELEMENT);$.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,Y0,i.width,i.height,1,F0,V0,D0)}O.clearLayerUpdates()}else $.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,0,i.width,i.height,i.depth,F0,V0,i.data)}else $.texImage3D(J.TEXTURE_2D_ARRAY,0,U0,i.width,i.height,i.depth,0,F0,V0,i.data);else if(O.isData3DTexture)if(C0){if(c0)$.texStorage3D(J.TEXTURE_3D,H0,U0,i.width,i.height,i.depth);if(j)$.texSubImage3D(J.TEXTURE_3D,0,0,0,0,i.width,i.height,i.depth,F0,V0,i.data)}else $.texImage3D(J.TEXTURE_3D,0,U0,i.width,i.height,i.depth,0,F0,V0,i.data);else if(O.isFramebufferTexture){if(c0)if(C0)$.texStorage2D(J.TEXTURE_2D,H0,U0,i.width,i.height);else{let{width:s,height:Y0}=i;for(let D0=0;D0<H0;D0++)$.texImage2D(J.TEXTURE_2D,D0,U0,s,Y0,0,F0,V0,null),s>>=1,Y0>>=1}}else if(O.isHTMLTexture){if("texElementImage2D"in J){let s=J.canvas;if(!s.hasAttribute("layoutsubtree"))s.setAttribute("layoutsubtree","true");if(i.parentNode!==s){s.appendChild(i),E.add(O),s.onpaint=(Y0)=>{let D0=Y0.changedElements;for(let t of E)if(D0.includes(t.image))t.needsUpdate=!0},s.requestPaint();return}if(J.texElementImage2D.length===3)J.texElementImage2D(J.TEXTURE_2D,J.RGBA8,i);else{let{RGBA:D0,RGBA:t,UNSIGNED_BYTE:N0}=J;J.texElementImage2D(J.TEXTURE_2D,0,D0,t,N0,i)}J.texParameteri(J.TEXTURE_2D,J.TEXTURE_MIN_FILTER,J.LINEAR),J.texParameteri(J.TEXTURE_2D,J.TEXTURE_WRAP_S,J.CLAMP_TO_EDGE),J.texParameteri(J.TEXTURE_2D,J.TEXTURE_WRAP_T,J.CLAMP_TO_EDGE)}}else if(I0.length>0){if(C0&&c0){let s=XJ(I0[0]);$.texStorage2D(J.TEXTURE_2D,H0,U0,s.width,s.height)}for(let s=0,Y0=I0.length;s<Y0;s++)if(W0=I0[s],C0){if(j)$.texSubImage2D(J.TEXTURE_2D,s,0,0,F0,V0,W0)}else $.texImage2D(J.TEXTURE_2D,s,U0,F0,V0,W0);O.generateMipmaps=!1}else if(C0){if(c0){let s=XJ(i);$.texStorage2D(J.TEXTURE_2D,H0,U0,s.width,s.height)}if(j)$.texSubImage2D(J.TEXTURE_2D,0,0,0,F0,V0,i)}else $.texImage2D(J.TEXTURE_2D,0,U0,F0,V0,i);if(q(O))A(g);if(X0.__version=Z0.version,O.onUpdate)O.onUpdate(O)}k.__version=O.version}function _0(k,O,w){if(O.image.length!==6)return;let g=n(k,O),e=O.source;$.bindTexture(J.TEXTURE_CUBE_MAP,k.__webglTexture,J.TEXTURE0+w);let Z0=W.get(e);if(e.version!==Z0.__version||g===!0){$.activeTexture(J.TEXTURE0+w);let X0=m0.getPrimaries(m0.workingColorSpace),u=O.colorSpace===J8?null:m0.getPrimaries(O.colorSpace),i=O.colorSpace===J8||X0===u?J.NONE:J.BROWSER_DEFAULT_WEBGL;$.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,O.flipY),$.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),$.pixelStorei(J.UNPACK_ALIGNMENT,O.unpackAlignment),$.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,i);let F0=O.isCompressedTexture||O.image[0].isCompressedTexture,V0=O.image[0]&&O.image[0].isDataTexture,U0=[];for(let t=0;t<6;t++){if(!F0&&!V0)U0[t]=D(O.image[t],!0,K.maxCubemapSize);else U0[t]=V0?O.image[t].image:O.image[t];U0[t]=n0(O,U0[t])}let W0=U0[0],I0=Z.convert(O.format,O.colorSpace),C0=Z.convert(O.type),c0=V(O.internalFormat,I0,C0,O.normalized,O.colorSpace),j=O.isVideoTexture!==!0,H0=Z0.__version===void 0||g===!0,s=e.dataReady,Y0=C(O,W0);v0(J.TEXTURE_CUBE_MAP,O);let D0;if(F0){if(j&&H0)$.texStorage2D(J.TEXTURE_CUBE_MAP,Y0,c0,W0.width,W0.height);for(let t=0;t<6;t++){D0=U0[t].mipmaps;for(let N0=0;N0<D0.length;N0++){let y0=D0[N0];if(O.format!==F9)if(I0!==null)if(j){if(s)$.compressedTexSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0,0,0,y0.width,y0.height,I0,y0.data)}else $.compressedTexImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0,c0,y0.width,y0.height,0,y0.data);else P0("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");else if(j){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0,0,0,y0.width,y0.height,I0,C0,y0.data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0,c0,y0.width,y0.height,0,I0,C0,y0.data)}}}else{if(D0=O.mipmaps,j&&H0){if(D0.length>0)Y0++;let t=XJ(U0[0]);$.texStorage2D(J.TEXTURE_CUBE_MAP,Y0,c0,t.width,t.height)}for(let t=0;t<6;t++)if(V0){if(j){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,U0[t].width,U0[t].height,I0,C0,U0[t].data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,c0,U0[t].width,U0[t].height,0,I0,C0,U0[t].data);for(let N0=0;N0<D0.length;N0++){let $J=D0[N0].image[t].image;if(j){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0+1,0,0,$J.width,$J.height,I0,C0,$J.data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0+1,c0,$J.width,$J.height,0,I0,C0,$J.data)}}else{if(j){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,I0,C0,U0[t])}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,c0,I0,C0,U0[t]);for(let N0=0;N0<D0.length;N0++){let y0=D0[N0];if(j){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0+1,0,0,I0,C0,y0.image[t])}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0+1,c0,I0,C0,y0.image[t])}}}if(q(O))A(J.TEXTURE_CUBE_MAP);if(Z0.__version=e.version,O.onUpdate)O.onUpdate(O)}k.__version=O.version}function B0(k,O,w,g,e,Z0){let X0=Z.convert(w.format,w.colorSpace),u=Z.convert(w.type),i=V(w.internalFormat,X0,u,w.normalized,w.colorSpace),F0=W.get(O),V0=W.get(w);if(V0.__renderTarget=O,!F0.__hasExternalTextures){let U0=Math.max(1,O.width>>Z0),W0=Math.max(1,O.height>>Z0);if(e===J.TEXTURE_3D||e===J.TEXTURE_2D_ARRAY)$.texImage3D(e,Z0,i,U0,W0,O.depth,0,X0,u,null);else $.texImage2D(e,Z0,i,U0,W0,0,X0,u,null)}if($.bindFramebuffer(J.FRAMEBUFFER,k),_(O))Y.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,g,e,V0.__webglTexture,0,OJ(O));else if(e===J.TEXTURE_2D||e>=J.TEXTURE_CUBE_MAP_POSITIVE_X&&e<=J.TEXTURE_CUBE_MAP_NEGATIVE_Z)J.framebufferTexture2D(J.FRAMEBUFFER,g,e,V0.__webglTexture,Z0);$.bindFramebuffer(J.FRAMEBUFFER,null)}function FJ(k,O,w){if(J.bindRenderbuffer(J.RENDERBUFFER,k),O.depthBuffer){let g=O.depthTexture,e=g&&g.isDepthTexture?g.type:null,Z0=z(O.stencilBuffer,e),X0=O.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;if(_(O))Y.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,OJ(O),Z0,O.width,O.height);else if(w)J.renderbufferStorageMultisample(J.RENDERBUFFER,OJ(O),Z0,O.width,O.height);else J.renderbufferStorage(J.RENDERBUFFER,Z0,O.width,O.height);J.framebufferRenderbuffer(J.FRAMEBUFFER,X0,J.RENDERBUFFER,k)}else{let g=O.textures;for(let e=0;e<g.length;e++){let Z0=g[e],X0=Z.convert(Z0.format,Z0.colorSpace),u=Z.convert(Z0.type),i=V(Z0.internalFormat,X0,u,Z0.normalized,Z0.colorSpace);if(_(O))Y.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,OJ(O),i,O.width,O.height);else if(w)J.renderbufferStorageMultisample(J.RENDERBUFFER,OJ(O),i,O.width,O.height);else J.renderbufferStorage(J.RENDERBUFFER,i,O.width,O.height)}}J.bindRenderbuffer(J.RENDERBUFFER,null)}function p0(k,O,w){let g=O.isWebGLCubeRenderTarget===!0;if($.bindFramebuffer(J.FRAMEBUFFER,k),!(O.depthTexture&&O.depthTexture.isDepthTexture))throw Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let e=W.get(O.depthTexture);if(e.__renderTarget=O,!e.__webglTexture||O.depthTexture.image.width!==O.width||O.depthTexture.image.height!==O.height)O.depthTexture.image.width=O.width,O.depthTexture.image.height=O.height,O.depthTexture.needsUpdate=!0;if(g){if(e.__webglInit===void 0)e.__webglInit=!0,O.depthTexture.addEventListener("dispose",P);if(e.__webglTexture===void 0){e.__webglTexture=J.createTexture(),$.bindTexture(J.TEXTURE_CUBE_MAP,e.__webglTexture),v0(J.TEXTURE_CUBE_MAP,O.depthTexture);let F0=Z.convert(O.depthTexture.format),V0=Z.convert(O.depthTexture.type),U0;if(O.depthTexture.format===r9)U0=J.DEPTH_COMPONENT24;else if(O.depthTexture.format===t9)U0=J.DEPTH24_STENCIL8;for(let W0=0;W0<6;W0++)J.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+W0,0,U0,O.width,O.height,0,F0,V0,null)}}else Q0(O.depthTexture,0);let Z0=e.__webglTexture,X0=OJ(O),u=g?J.TEXTURE_CUBE_MAP_POSITIVE_X+w:J.TEXTURE_2D,i=O.depthTexture.format===t9?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;if(O.depthTexture.format===r9)if(_(O))Y.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,i,u,Z0,0,X0);else J.framebufferTexture2D(J.FRAMEBUFFER,i,u,Z0,0);else if(O.depthTexture.format===t9)if(_(O))Y.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,i,u,Z0,0,X0);else J.framebufferTexture2D(J.FRAMEBUFFER,i,u,Z0,0);else throw Error("THREE.WebGLTextures: Unknown depthTexture format.")}function l0(k){let O=W.get(k),w=k.isWebGLCubeRenderTarget===!0;if(O.__boundDepthTexture!==k.depthTexture){let g=k.depthTexture;if(O.__depthDisposeCallback)O.__depthDisposeCallback();if(g){let e=()=>{delete O.__boundDepthTexture,delete O.__depthDisposeCallback,g.removeEventListener("dispose",e)};g.addEventListener("dispose",e),O.__depthDisposeCallback=e}O.__boundDepthTexture=g}if(k.depthTexture&&!O.__autoAllocateDepthBuffer)if(w)for(let g=0;g<6;g++)p0(O.__webglFramebuffer[g],k,g);else{let g=k.texture.mipmaps;if(g&&g.length>0)p0(O.__webglFramebuffer[0],k,0);else p0(O.__webglFramebuffer,k,0)}else if(w){O.__webglDepthbuffer=[];for(let g=0;g<6;g++)if($.bindFramebuffer(J.FRAMEBUFFER,O.__webglFramebuffer[g]),O.__webglDepthbuffer[g]===void 0)O.__webglDepthbuffer[g]=J.createRenderbuffer(),FJ(O.__webglDepthbuffer[g],k,!1);else{let e=k.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,Z0=O.__webglDepthbuffer[g];J.bindRenderbuffer(J.RENDERBUFFER,Z0),J.framebufferRenderbuffer(J.FRAMEBUFFER,e,J.RENDERBUFFER,Z0)}}else{let g=k.texture.mipmaps;if(g&&g.length>0)$.bindFramebuffer(J.FRAMEBUFFER,O.__webglFramebuffer[0]);else $.bindFramebuffer(J.FRAMEBUFFER,O.__webglFramebuffer);if(O.__webglDepthbuffer===void 0)O.__webglDepthbuffer=J.createRenderbuffer(),FJ(O.__webglDepthbuffer,k,!1);else{let e=k.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,Z0=O.__webglDepthbuffer;J.bindRenderbuffer(J.RENDERBUFFER,Z0),J.framebufferRenderbuffer(J.FRAMEBUFFER,e,J.RENDERBUFFER,Z0)}}$.bindFramebuffer(J.FRAMEBUFFER,null)}function o0(k,O,w){let g=W.get(k);if(O!==void 0)B0(g.__webglFramebuffer,k,k.texture,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,0);if(w!==void 0)l0(k)}function d0(k){let O=k.texture,w=W.get(k),g=W.get(O);k.addEventListener("dispose",M);let e=k.textures,Z0=k.isWebGLCubeRenderTarget===!0,X0=e.length>1;if(!X0){if(g.__webglTexture===void 0)g.__webglTexture=J.createTexture();g.__version=O.version,H.memory.textures++}if(Z0){w.__webglFramebuffer=[];for(let u=0;u<6;u++)if(O.mipmaps&&O.mipmaps.length>0){w.__webglFramebuffer[u]=[];for(let i=0;i<O.mipmaps.length;i++)w.__webglFramebuffer[u][i]=J.createFramebuffer()}else w.__webglFramebuffer[u]=J.createFramebuffer()}else{if(O.mipmaps&&O.mipmaps.length>0){w.__webglFramebuffer=[];for(let u=0;u<O.mipmaps.length;u++)w.__webglFramebuffer[u]=J.createFramebuffer()}else w.__webglFramebuffer=J.createFramebuffer();if(X0)for(let u=0,i=e.length;u<i;u++){let F0=W.get(e[u]);if(F0.__webglTexture===void 0)F0.__webglTexture=J.createTexture(),H.memory.textures++}if(k.samples>0&&_(k)===!1){w.__webglMultisampledFramebuffer=J.createFramebuffer(),w.__webglColorRenderbuffer=[],$.bindFramebuffer(J.FRAMEBUFFER,w.__webglMultisampledFramebuffer);for(let u=0;u<e.length;u++){let i=e[u];w.__webglColorRenderbuffer[u]=J.createRenderbuffer(),J.bindRenderbuffer(J.RENDERBUFFER,w.__webglColorRenderbuffer[u]);let F0=Z.convert(i.format,i.colorSpace),V0=Z.convert(i.type),U0=V(i.internalFormat,F0,V0,i.normalized,i.colorSpace,k.isXRRenderTarget===!0),W0=OJ(k);J.renderbufferStorageMultisample(J.RENDERBUFFER,W0,U0,k.width,k.height),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+u,J.RENDERBUFFER,w.__webglColorRenderbuffer[u])}if(J.bindRenderbuffer(J.RENDERBUFFER,null),k.depthBuffer)w.__webglDepthRenderbuffer=J.createRenderbuffer(),FJ(w.__webglDepthRenderbuffer,k,!0);$.bindFramebuffer(J.FRAMEBUFFER,null)}}if(Z0){$.bindTexture(J.TEXTURE_CUBE_MAP,g.__webglTexture),v0(J.TEXTURE_CUBE_MAP,O);for(let u=0;u<6;u++)if(O.mipmaps&&O.mipmaps.length>0)for(let i=0;i<O.mipmaps.length;i++)B0(w.__webglFramebuffer[u][i],k,O,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+u,i);else B0(w.__webglFramebuffer[u],k,O,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+u,0);if(q(O))A(J.TEXTURE_CUBE_MAP);$.unbindTexture()}else if(X0){for(let u=0,i=e.length;u<i;u++){let F0=e[u],V0=W.get(F0),U0=J.TEXTURE_2D;if(k.isWebGL3DRenderTarget||k.isWebGLArrayRenderTarget)U0=k.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if($.bindTexture(U0,V0.__webglTexture),v0(U0,F0),B0(w.__webglFramebuffer,k,F0,J.COLOR_ATTACHMENT0+u,U0,0),q(F0))A(U0)}$.unbindTexture()}else{let u=J.TEXTURE_2D;if(k.isWebGL3DRenderTarget||k.isWebGLArrayRenderTarget)u=k.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if($.bindTexture(u,g.__webglTexture),v0(u,O),O.mipmaps&&O.mipmaps.length>0)for(let i=0;i<O.mipmaps.length;i++)B0(w.__webglFramebuffer[i],k,O,J.COLOR_ATTACHMENT0,u,i);else B0(w.__webglFramebuffer,k,O,J.COLOR_ATTACHMENT0,u,0);if(q(O))A(u);$.unbindTexture()}if(k.depthBuffer)l0(k)}function BJ(k){let O=k.textures;for(let w=0,g=O.length;w<g;w++){let e=O[w];if(q(e)){let Z0=y(k),X0=W.get(e).__webglTexture;$.bindTexture(Z0,X0),A(Z0),$.unbindTexture()}}}let HJ=[],hJ=[];function DJ(k){if(k.samples>0){if(_(k)===!1){let{textures:O,width:w,height:g}=k,e=J.COLOR_BUFFER_BIT,Z0=k.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,X0=W.get(k),u=O.length>1;if(u)for(let F0=0;F0<O.length;F0++)$.bindFramebuffer(J.FRAMEBUFFER,X0.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+F0,J.RENDERBUFFER,null),$.bindFramebuffer(J.FRAMEBUFFER,X0.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+F0,J.TEXTURE_2D,null,0);$.bindFramebuffer(J.READ_FRAMEBUFFER,X0.__webglMultisampledFramebuffer);let i=k.texture.mipmaps;if(i&&i.length>0)$.bindFramebuffer(J.DRAW_FRAMEBUFFER,X0.__webglFramebuffer[0]);else $.bindFramebuffer(J.DRAW_FRAMEBUFFER,X0.__webglFramebuffer);for(let F0=0;F0<O.length;F0++){if(k.resolveDepthBuffer){if(k.depthBuffer)e|=J.DEPTH_BUFFER_BIT;if(k.stencilBuffer&&k.resolveStencilBuffer)e|=J.STENCIL_BUFFER_BIT}if(u){J.framebufferRenderbuffer(J.READ_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.RENDERBUFFER,X0.__webglColorRenderbuffer[F0]);let V0=W.get(O[F0]).__webglTexture;J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,V0,0)}if(J.blitFramebuffer(0,0,w,g,0,0,w,g,e,J.NEAREST),X===!0){if(HJ.length=0,hJ.length=0,HJ.push(J.COLOR_ATTACHMENT0+F0),k.depthBuffer&&k.storeMultisampledDepthBuffer===!1)HJ.push(Z0),hJ.push(Z0),J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,hJ);J.invalidateFramebuffer(J.READ_FRAMEBUFFER,HJ)}}if($.bindFramebuffer(J.READ_FRAMEBUFFER,null),$.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),u)for(let F0=0;F0<O.length;F0++){$.bindFramebuffer(J.FRAMEBUFFER,X0.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+F0,J.RENDERBUFFER,X0.__webglColorRenderbuffer[F0]);let V0=W.get(O[F0]).__webglTexture;$.bindFramebuffer(J.FRAMEBUFFER,X0.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+F0,J.TEXTURE_2D,V0,0)}$.bindFramebuffer(J.DRAW_FRAMEBUFFER,X0.__webglMultisampledFramebuffer)}else if(k.depthBuffer&&k.storeMultisampledDepthBuffer===!1&&X){let O=k.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,[O])}}}function OJ(k){return Math.min(K.maxSamples,k.samples)}function _(k){let O=W.get(k);return k.samples>0&&Q.has("WEBGL_multisampled_render_to_texture")===!0&&O.__useRenderToTexture!==!1}function vJ(k){let O=H.render.frame;if(N.get(k)!==O)N.set(k,O),k.update()}function n0(k,O){let{colorSpace:w,format:g,type:e}=k;if(k.isCompressedTexture===!0||k.isVideoTexture===!0)return O;if(w!==xQ&&w!==J8)if(m0.getTransfer(w)===JJ){if(g!==F9||e!==H9)P0("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.")}else T0("WebGLTextures: Unsupported texture color space:",w);return O}function XJ(k){if(typeof HTMLImageElement<"u"&&k instanceof HTMLImageElement)U.width=k.naturalWidth||k.width,U.height=k.naturalHeight||k.height;else if(typeof VideoFrame<"u"&&k instanceof VideoFrame)U.width=k.displayWidth,U.height=k.displayHeight;else U.width=k.width,U.height=k.height;return U}this.allocateTextureUnit=o,this.resetTextureUnits=r,this.getTextureUnits=S,this.setTextureUnits=d,this.setTexture2D=Q0,this.setTexture2DArray=c,this.setTexture3D=a,this.setTextureCube=J0,this.rebindTextures=o0,this.setupRenderTarget=d0,this.updateRenderTargetMipmap=BJ,this.updateMultisampleRenderTarget=DJ,this.setupDepthRenderbuffer=l0,this.setupFrameBufferTexture=B0,this.useMultisampledRTT=_,this.isReversedDepthBuffer=function(){return $.buffers.depth.getReversed()}}function DN(J,Q){function $(W,K=J8){let Z,H=m0.getTransfer(K);if(W===H9)return J.UNSIGNED_BYTE;if(W===$Q)return J.UNSIGNED_SHORT_4_4_4_4;if(W===WQ)return J.UNSIGNED_SHORT_5_5_5_1;if(W===WK)return J.UNSIGNED_INT_5_9_9_9_REV;if(W===KK)return J.UNSIGNED_INT_10F_11F_11F_REV;if(W===QK)return J.BYTE;if(W===$K)return J.SHORT;if(W===Y7)return J.UNSIGNED_SHORT;if(W===QQ)return J.INT;if(W===p9)return J.UNSIGNED_INT;if(W===C9)return J.FLOAT;if(W===E9)return J.HALF_FLOAT;if(W===ZK)return J.ALPHA;if(W===HK)return J.RGB;if(W===F9)return J.RGBA;if(W===r9)return J.DEPTH_COMPONENT;if(W===t9)return J.DEPTH_STENCIL;if(W===YK)return J.RED;if(W===KQ)return J.RED_INTEGER;if(W===e9)return J.RG;if(W===ZQ)return J.RG_INTEGER;if(W===HQ)return J.RGBA_INTEGER;if(W===n7||W===s7||W===i7||W===o7)if(H===JJ)if(Z=Q.get("WEBGL_compressed_texture_s3tc_srgb"),Z!==null){if(W===n7)return Z.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(W===s7)return Z.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(W===i7)return Z.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(W===o7)return Z.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(Z=Q.get("WEBGL_compressed_texture_s3tc"),Z!==null){if(W===n7)return Z.COMPRESSED_RGB_S3TC_DXT1_EXT;if(W===s7)return Z.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(W===i7)return Z.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(W===o7)return Z.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(W===YQ||W===XQ||W===UQ||W===GQ)if(Z=Q.get("WEBGL_compressed_texture_pvrtc"),Z!==null){if(W===YQ)return Z.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(W===XQ)return Z.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(W===UQ)return Z.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(W===GQ)return Z.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(W===NQ||W===qQ||W===EQ||W===FQ||W===DQ||W===a7||W===OQ)if(Z=Q.get("WEBGL_compressed_texture_etc"),Z!==null){if(W===NQ||W===qQ)return H===JJ?Z.COMPRESSED_SRGB8_ETC2:Z.COMPRESSED_RGB8_ETC2;if(W===EQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:Z.COMPRESSED_RGBA8_ETC2_EAC;if(W===FQ)return Z.COMPRESSED_R11_EAC;if(W===DQ)return Z.COMPRESSED_SIGNED_R11_EAC;if(W===a7)return Z.COMPRESSED_RG11_EAC;if(W===OQ)return Z.COMPRESSED_SIGNED_RG11_EAC}else return null;if(W===RQ||W===MQ||W===LQ||W===kQ||W===VQ||W===BQ||W===IQ||W===zQ||W===AQ||W===CQ||W===PQ||W===wQ||W===_Q||W===TQ)if(Z=Q.get("WEBGL_compressed_texture_astc"),Z!==null){if(W===RQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:Z.COMPRESSED_RGBA_ASTC_4x4_KHR;if(W===MQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:Z.COMPRESSED_RGBA_ASTC_5x4_KHR;if(W===LQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:Z.COMPRESSED_RGBA_ASTC_5x5_KHR;if(W===kQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:Z.COMPRESSED_RGBA_ASTC_6x5_KHR;if(W===VQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:Z.COMPRESSED_RGBA_ASTC_6x6_KHR;if(W===BQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:Z.COMPRESSED_RGBA_ASTC_8x5_KHR;if(W===IQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:Z.COMPRESSED_RGBA_ASTC_8x6_KHR;if(W===zQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:Z.COMPRESSED_RGBA_ASTC_8x8_KHR;if(W===AQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:Z.COMPRESSED_RGBA_ASTC_10x5_KHR;if(W===CQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:Z.COMPRESSED_RGBA_ASTC_10x6_KHR;if(W===PQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:Z.COMPRESSED_RGBA_ASTC_10x8_KHR;if(W===wQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:Z.COMPRESSED_RGBA_ASTC_10x10_KHR;if(W===_Q)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:Z.COMPRESSED_RGBA_ASTC_12x10_KHR;if(W===TQ)return H===JJ?Z.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:Z.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(W===SQ||W===jQ||W===yQ)if(Z=Q.get("EXT_texture_compression_bptc"),Z!==null){if(W===SQ)return H===JJ?Z.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:Z.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(W===jQ)return Z.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(W===yQ)return Z.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(W===fQ||W===hQ||W===r7||W===vQ)if(Z=Q.get("EXT_texture_compression_rgtc"),Z!==null){if(W===fQ)return Z.COMPRESSED_RED_RGTC1_EXT;if(W===hQ)return Z.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(W===r7)return Z.COMPRESSED_RED_GREEN_RGTC2_EXT;if(W===vQ)return Z.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;if(W===b8)return J.UNSIGNED_INT_24_8;return J[W]!==void 0?J[W]:null}return{convert:$}}var ON=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,RN=`
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

}`;class WZ{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(J,Q){if(this.texture===null){let $=new H6(J.texture);if(J.depthNear!==Q.depthNear||J.depthFar!==Q.depthFar)this.depthNear=J.depthNear,this.depthFar=J.depthFar;this.texture=$}}getMesh(J){if(this.texture!==null){if(this.mesh===null){let Q=J.cameras[0].viewport,$=new SJ({vertexShader:ON,fragmentShader:RN,uniforms:{depthColor:{value:this.texture},depthWidth:{value:Q.z},depthHeight:{value:Q.w}}});this.mesh=new zJ(new W8(20,20),$)}}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class KZ extends D9{constructor(J,Q){super();let $=this,W=null,K=1,Z=null,H="local-floor",Y=1,X=null,U=null,N=null,E=null,G=null,F=null,L=typeof XRWebGLBinding<"u",I=new WZ,D={},q=Q.getContextAttributes(),A=null,y=null,V=[],z=[],C=new S0,P=null,M=null,B=new uJ;B.viewport=new UJ;let l=new uJ;l.viewport=new UJ;let h=[B,l],v=new N$,r=null,S=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(n){let $0=V[n];if($0===void 0)$0=new G7,V[n]=$0;return $0.getTargetRaySpace()},this.getControllerGrip=function(n){let $0=V[n];if($0===void 0)$0=new G7,V[n]=$0;return $0.getGripSpace()},this.getHand=function(n){let $0=V[n];if($0===void 0)$0=new G7,V[n]=$0;return $0.getHandSpace()};function d(n){let $0=z.indexOf(n.inputSource);if($0===-1)return;let K0=V[$0];if(K0!==void 0)K0.update(n.inputSource,n.frame,X||Z),K0.dispatchEvent({type:n.type,data:n.inputSource})}function o(){W.removeEventListener("select",d),W.removeEventListener("selectstart",d),W.removeEventListener("selectend",d),W.removeEventListener("squeeze",d),W.removeEventListener("squeezestart",d),W.removeEventListener("squeezeend",d),W.removeEventListener("end",o),W.removeEventListener("inputsourceschange",m);for(let n=0;n<V.length;n++){let $0=z[n];if($0===null)continue;z[n]=null,V[n].disconnect($0)}r=null,S=null,I.reset();for(let n in D)delete D[n];if(J.setRenderTarget(A),G=null,E=null,N=null,W=null,y=null,v0.stop(),$.isPresenting=!1,J.setPixelRatio(P),J.setSize(C.width,C.height,!1),M!==null){let n=M.camera;n.fov=M.fov,n.zoom=M.zoom,n.updateProjectionMatrix(),M=null}$.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(n){if(K=n,$.isPresenting===!0)P0("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(n){if(H=n,$.isPresenting===!0)P0("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return X||Z},this.setReferenceSpace=function(n){X=n},this.getBaseLayer=function(){return E!==null?E:G},this.getBinding=function(){if(N===null&&L)N=new XRWebGLBinding(W,Q);return N},this.getFrame=function(){return F},this.getSession=function(){return W},this.setSession=async function(n){if(W=n,W!==null){if(A=J.getRenderTarget(),W.addEventListener("select",d),W.addEventListener("selectstart",d),W.addEventListener("selectend",d),W.addEventListener("squeeze",d),W.addEventListener("squeezestart",d),W.addEventListener("squeezeend",d),W.addEventListener("end",o),W.addEventListener("inputsourceschange",m),q.xrCompatible!==!0)await Q.makeXRCompatible();if(P=J.getPixelRatio(),J.getSize(C),!(L&&("createProjectionLayer"in XRWebGLBinding.prototype))){let K0={antialias:q.antialias,alpha:!0,depth:q.depth,stencil:q.stencil,framebufferScaleFactor:K};G=new XRWebGLLayer(W,Q,K0),W.updateRenderState({baseLayer:G}),J.setPixelRatio(1),J.setSize(G.framebufferWidth,G.framebufferHeight,!1),y=new cJ(G.framebufferWidth,G.framebufferHeight,{format:F9,type:H9,colorSpace:J.outputColorSpace,stencilBuffer:q.stencil,resolveDepthBuffer:G.ignoreDepthValues===!1,resolveStencilBuffer:G.ignoreDepthValues===!1,storeMultisampledDepthBuffer:G.ignoreDepthValues===!1,storeMultisampledStencilBuffer:G.ignoreDepthValues===!1})}else{let K0=null,A0=null,_0=null;if(q.depth)_0=q.stencil?Q.DEPTH24_STENCIL8:Q.DEPTH_COMPONENT24,K0=q.stencil?t9:r9,A0=q.stencil?b8:p9;let B0={colorFormat:Q.RGBA8,depthFormat:_0,scaleFactor:K};N=this.getBinding(),E=N.createProjectionLayer(B0),W.updateRenderState({layers:[E]}),J.setPixelRatio(1),J.setSize(E.textureWidth,E.textureHeight,!1),y=new cJ(E.textureWidth,E.textureHeight,{format:F9,type:H9,depthTexture:new $8(E.textureWidth,E.textureHeight,A0,void 0,void 0,void 0,void 0,void 0,void 0,K0),stencilBuffer:q.stencil,colorSpace:J.outputColorSpace,samples:q.antialias?4:0,resolveDepthBuffer:E.ignoreDepthValues===!1,resolveStencilBuffer:E.ignoreDepthValues===!1,storeMultisampledDepthBuffer:E.ignoreDepthValues===!1,storeMultisampledStencilBuffer:E.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(Y),X=null,Z=await W.requestReferenceSpace(H),v0.setContext(W),v0.start(),$.isPresenting=!0,$.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(W!==null)return W.environmentBlendMode},this.getDepthTexture=function(){return I.getDepthTexture()};function m(n){for(let $0=0;$0<n.removed.length;$0++){let K0=n.removed[$0],A0=z.indexOf(K0);if(A0>=0)z[A0]=null,V[A0].disconnect(K0)}for(let $0=0;$0<n.added.length;$0++){let K0=n.added[$0],A0=z.indexOf(K0);if(A0===-1){for(let B0=0;B0<V.length;B0++)if(B0>=z.length){z.push(K0),A0=B0;break}else if(z[B0]===null){z[B0]=K0,A0=B0;break}if(A0===-1)break}let _0=V[A0];if(_0)_0.connect(K0)}}let Q0=new f,c=new f;function a(n,$0,K0){Q0.setFromMatrixPosition($0.matrixWorld),c.setFromMatrixPosition(K0.matrixWorld);let A0=Q0.distanceTo(c),_0=$0.projectionMatrix.elements,B0=K0.projectionMatrix.elements,FJ=_0[14]/(_0[10]-1),p0=_0[14]/(_0[10]+1),l0=(_0[9]+1)/_0[5],o0=(_0[9]-1)/_0[5],d0=(_0[8]-1)/_0[0],BJ=(B0[8]+1)/B0[0],HJ=FJ*d0,hJ=FJ*BJ,DJ=A0/(-d0+BJ),OJ=DJ*-d0;if($0.matrixWorld.decompose(n.position,n.quaternion,n.scale),n.translateX(OJ),n.translateZ(DJ),n.matrixWorld.compose(n.position,n.quaternion,n.scale),n.matrixWorldInverse.copy(n.matrixWorld).invert(),_0[10]===-1)n.projectionMatrix.copy($0.projectionMatrix),n.projectionMatrixInverse.copy($0.projectionMatrixInverse);else{let _=FJ+DJ,vJ=p0+DJ,n0=HJ-OJ,XJ=hJ+(A0-OJ),k=l0*p0/vJ*_,O=o0*p0/vJ*_;n.projectionMatrix.makePerspective(n0,XJ,k,O,_,vJ),n.projectionMatrixInverse.copy(n.projectionMatrix).invert()}}function J0(n,$0){if($0===null)n.matrixWorld.copy(n.matrix);else n.matrixWorld.multiplyMatrices($0.matrixWorld,n.matrix);n.matrixWorldInverse.copy(n.matrixWorld).invert()}this.updateCamera=function(n){if(W===null)return;let{near:$0,far:K0}=n;if(I.texture!==null){if(I.depthNear>0)$0=I.depthNear;if(I.depthFar>0)K0=I.depthFar}if(v.near=l.near=B.near=$0,v.far=l.far=B.far=K0,r!==v.near||S!==v.far)W.updateRenderState({depthNear:v.near,depthFar:v.far}),r=v.near,S=v.far;v.layers.mask=n.layers.mask|6,B.layers.mask=v.layers.mask&-5,l.layers.mask=v.layers.mask&-3;let A0=n.parent,_0=v.cameras;J0(v,A0);for(let B0=0;B0<_0.length;B0++)J0(_0[B0],A0);if(_0.length===2)a(v,B,l);else v.projectionMatrix.copy(B.projectionMatrix);if(M===null&&n.isPerspectiveCamera)M={camera:n,fov:n.fov,zoom:n.zoom};w0(n,v,A0)};function w0(n,$0,K0){if(K0===null)n.matrix.copy($0.matrixWorld);else n.matrix.copy(K0.matrixWorld),n.matrix.invert(),n.matrix.multiply($0.matrixWorld);if(n.matrix.decompose(n.position,n.quaternion,n.scale),n.updateMatrixWorld(!0),n.projectionMatrix.copy($0.projectionMatrix),n.projectionMatrixInverse.copy($0.projectionMatrixInverse),n.isPerspectiveCamera)n.fov=j8*2*Math.atan(1/n.projectionMatrix.elements[5]),n.zoom=1}this.getCamera=function(){return v},this.getFoveation=function(){if(E===null&&G===null)return;return Y},this.setFoveation=function(n){if(Y=n,E!==null)E.fixedFoveation=n;if(G!==null&&G.fixedFoveation!==void 0)G.fixedFoveation=n},this.hasDepthSensing=function(){return I.texture!==null},this.getDepthSensingMesh=function(){return I.getMesh(v)},this.getCameraTexture=function(n){return D[n]};let z0=null;function QJ(n,$0){if(U=$0.getViewerPose(X||Z),F=$0,U!==null){let K0=U.views;if(G!==null)J.setRenderTargetFramebuffer(y,G.framebuffer),J.setRenderTarget(y);let A0=!1;if(K0.length!==v.cameras.length)v.cameras.length=0,A0=!0;for(let p0=0;p0<K0.length;p0++){let l0=K0[p0],o0=null;if(G!==null)o0=G.getViewport(l0);else{let BJ=N.getViewSubImage(E,l0);if(o0=BJ.viewport,p0===0)J.setRenderTargetTextures(y,BJ.colorTexture,BJ.depthStencilTexture),J.setRenderTarget(y)}let d0=h[p0];if(d0===void 0)d0=new uJ,d0.layers.enable(p0),d0.viewport=new UJ,h[p0]=d0;if(d0.matrix.fromArray(l0.transform.matrix),d0.matrix.decompose(d0.position,d0.quaternion,d0.scale),d0.projectionMatrix.fromArray(l0.projectionMatrix),d0.projectionMatrixInverse.copy(d0.projectionMatrix).invert(),d0.viewport.set(o0.x,o0.y,o0.width,o0.height),p0===0)v.matrix.copy(d0.matrix),v.matrix.decompose(v.position,v.quaternion,v.scale);if(A0===!0)v.cameras.push(d0)}let _0=W.enabledFeatures;if(_0&&_0.includes("depth-sensing")&&W.depthUsage=="gpu-optimized"&&L){N=$.getBinding();let p0=N.getDepthInformation(K0[0]);if(p0&&p0.isValid&&p0.texture)I.init(p0,W.renderState)}if(_0&&_0.includes("camera-access")&&L){J.state.unbindTexture(),N=$.getBinding();for(let p0=0;p0<K0.length;p0++){let l0=K0[p0].camera;if(l0){let o0=D[l0];if(!o0)o0=new H6,D[l0]=o0;let d0=N.getCameraImage(l0);o0.sourceTexture=d0}}}}for(let K0=0;K0<V.length;K0++){let A0=z[K0],_0=V[K0];if(A0!==null&&_0!==void 0)_0.update(A0,$0,X||Z)}if(z0)z0(n,$0);if($0.detectedPlanes)$.dispatchEvent({type:"planesdetected",data:$0});F=null}let v0=new nK;v0.setAnimationLoop(QJ),this.setAnimationLoop=function(n){z0=n},this.dispose=function(){}}}var MN=new KJ,ZZ=new j0;ZZ.set(-1,0,0,0,1,0,0,0,1);function LN(J,Q){function $(D,q){if(D.matrixAutoUpdate===!0)D.updateMatrix();q.value.copy(D.matrix)}function W(D,q){if(q.color.getRGB(D.fogColor.value,aQ(J)),q.isFog)D.fogNear.value=q.near,D.fogFar.value=q.far;else if(q.isFogExp2)D.fogDensity.value=q.density}function K(D,q,A,y,V){if(q.isNodeMaterial)q.uniformsNeedUpdate=!1;else if(q.isMeshBasicMaterial)Z(D,q);else if(q.isMeshLambertMaterial){if(Z(D,q),q.envMap)D.envMapIntensity.value=q.envMapIntensity}else if(q.isMeshToonMaterial)Z(D,q),E(D,q);else if(q.isMeshPhongMaterial){if(Z(D,q),N(D,q),q.envMap)D.envMapIntensity.value=q.envMapIntensity}else if(q.isMeshStandardMaterial){if(Z(D,q),G(D,q),q.isMeshPhysicalMaterial)F(D,q,V)}else if(q.isMeshMatcapMaterial)Z(D,q),L(D,q);else if(q.isMeshDepthMaterial)Z(D,q);else if(q.isMeshDistanceMaterial)Z(D,q),I(D,q);else if(q.isMeshNormalMaterial)Z(D,q);else if(q.isLineBasicMaterial){if(H(D,q),q.isLineDashedMaterial)Y(D,q)}else if(q.isPointsMaterial)X(D,q,A,y);else if(q.isSpriteMaterial)U(D,q);else if(q.isShadowMaterial)D.color.value.copy(q.color),D.opacity.value=q.opacity;else if(q.isShaderMaterial)q.uniformsNeedUpdate=!1}function Z(D,q){if(D.opacity.value=q.opacity,q.color)D.diffuse.value.copy(q.color);if(q.emissive)D.emissive.value.copy(q.emissive).multiplyScalar(q.emissiveIntensity);if(q.map)D.map.value=q.map,$(q.map,D.mapTransform);if(q.alphaMap)D.alphaMap.value=q.alphaMap,$(q.alphaMap,D.alphaMapTransform);if(q.bumpMap){if(D.bumpMap.value=q.bumpMap,$(q.bumpMap,D.bumpMapTransform),D.bumpScale.value=q.bumpScale,q.side===bJ)D.bumpScale.value*=-1}if(q.normalMap){if(D.normalMap.value=q.normalMap,$(q.normalMap,D.normalMapTransform),D.normalScale.value.copy(q.normalScale),q.side===bJ)D.normalScale.value.negate()}if(q.displacementMap)D.displacementMap.value=q.displacementMap,$(q.displacementMap,D.displacementMapTransform),D.displacementScale.value=q.displacementScale,D.displacementBias.value=q.displacementBias;if(q.emissiveMap)D.emissiveMap.value=q.emissiveMap,$(q.emissiveMap,D.emissiveMapTransform);if(q.specularMap)D.specularMap.value=q.specularMap,$(q.specularMap,D.specularMapTransform);if(q.alphaTest>0)D.alphaTest.value=q.alphaTest;let A=Q.get(q),y=A.envMap,V=A.envMapRotation;if(y){if(D.envMap.value=y,D.envMapRotation.value.setFromMatrix4(MN.makeRotationFromEuler(V)).transpose(),y.isCubeTexture&&y.isRenderTargetTexture===!1)D.envMapRotation.value.premultiply(ZZ);D.reflectivity.value=q.reflectivity,D.ior.value=q.ior,D.refractionRatio.value=q.refractionRatio}if(q.lightMap)D.lightMap.value=q.lightMap,D.lightMapIntensity.value=q.lightMapIntensity,$(q.lightMap,D.lightMapTransform);if(q.aoMap)D.aoMap.value=q.aoMap,D.aoMapIntensity.value=q.aoMapIntensity,$(q.aoMap,D.aoMapTransform)}function H(D,q){if(D.diffuse.value.copy(q.color),D.opacity.value=q.opacity,q.map)D.map.value=q.map,$(q.map,D.mapTransform)}function Y(D,q){D.dashSize.value=q.dashSize,D.totalSize.value=q.dashSize+q.gapSize,D.scale.value=q.scale}function X(D,q,A,y){if(D.diffuse.value.copy(q.color),D.opacity.value=q.opacity,D.size.value=q.size*A,D.scale.value=y*0.5,q.map)D.map.value=q.map,$(q.map,D.uvTransform);if(q.alphaMap)D.alphaMap.value=q.alphaMap,$(q.alphaMap,D.alphaMapTransform);if(q.alphaTest>0)D.alphaTest.value=q.alphaTest}function U(D,q){if(D.diffuse.value.copy(q.color),D.opacity.value=q.opacity,D.rotation.value=q.rotation,q.map)D.map.value=q.map,$(q.map,D.mapTransform);if(q.alphaMap)D.alphaMap.value=q.alphaMap,$(q.alphaMap,D.alphaMapTransform);if(q.alphaTest>0)D.alphaTest.value=q.alphaTest}function N(D,q){D.specular.value.copy(q.specular),D.shininess.value=Math.max(q.shininess,0.0001)}function E(D,q){if(q.gradientMap)D.gradientMap.value=q.gradientMap}function G(D,q){if(D.metalness.value=q.metalness,q.metalnessMap)D.metalnessMap.value=q.metalnessMap,$(q.metalnessMap,D.metalnessMapTransform);if(D.roughness.value=q.roughness,q.roughnessMap)D.roughnessMap.value=q.roughnessMap,$(q.roughnessMap,D.roughnessMapTransform);if(q.envMap)D.envMapIntensity.value=q.envMapIntensity}function F(D,q,A){if(D.ior.value=q.ior,q.sheen>0){if(D.sheenColor.value.copy(q.sheenColor).multiplyScalar(q.sheen),D.sheenRoughness.value=q.sheenRoughness,q.sheenColorMap)D.sheenColorMap.value=q.sheenColorMap,$(q.sheenColorMap,D.sheenColorMapTransform);if(q.sheenRoughnessMap)D.sheenRoughnessMap.value=q.sheenRoughnessMap,$(q.sheenRoughnessMap,D.sheenRoughnessMapTransform)}if(q.clearcoat>0){if(D.clearcoat.value=q.clearcoat,D.clearcoatRoughness.value=q.clearcoatRoughness,q.clearcoatMap)D.clearcoatMap.value=q.clearcoatMap,$(q.clearcoatMap,D.clearcoatMapTransform);if(q.clearcoatRoughnessMap)D.clearcoatRoughnessMap.value=q.clearcoatRoughnessMap,$(q.clearcoatRoughnessMap,D.clearcoatRoughnessMapTransform);if(q.clearcoatNormalMap){if(D.clearcoatNormalMap.value=q.clearcoatNormalMap,$(q.clearcoatNormalMap,D.clearcoatNormalMapTransform),D.clearcoatNormalScale.value.copy(q.clearcoatNormalScale),q.side===bJ)D.clearcoatNormalScale.value.negate()}}if(q.dispersion>0)D.dispersion.value=q.dispersion;if(q.retroreflectivity>0)D.retroreflectivity.value=q.retroreflectivity;if(q.iridescence>0){if(D.iridescence.value=q.iridescence,D.iridescenceIOR.value=q.iridescenceIOR,D.iridescenceThicknessMinimum.value=q.iridescenceThicknessRange[0],D.iridescenceThicknessMaximum.value=q.iridescenceThicknessRange[1],q.iridescenceMap)D.iridescenceMap.value=q.iridescenceMap,$(q.iridescenceMap,D.iridescenceMapTransform);if(q.iridescenceThicknessMap)D.iridescenceThicknessMap.value=q.iridescenceThicknessMap,$(q.iridescenceThicknessMap,D.iridescenceThicknessMapTransform)}if(q.transmission>0){if(D.transmission.value=q.transmission,D.transmissionSamplerMap.value=A.texture,D.transmissionSamplerSize.value.set(A.width,A.height),q.transmissionMap)D.transmissionMap.value=q.transmissionMap,$(q.transmissionMap,D.transmissionMapTransform);if(D.thickness.value=q.thickness,q.thicknessMap)D.thicknessMap.value=q.thicknessMap,$(q.thicknessMap,D.thicknessMapTransform);D.attenuationDistance.value=q.attenuationDistance,D.attenuationColor.value.copy(q.attenuationColor)}if(q.anisotropy>0){if(D.anisotropyVector.value.set(q.anisotropy*Math.cos(q.anisotropyRotation),q.anisotropy*Math.sin(q.anisotropyRotation)),q.anisotropyMap)D.anisotropyMap.value=q.anisotropyMap,$(q.anisotropyMap,D.anisotropyMapTransform)}if(D.specularIntensity.value=q.specularIntensity,D.specularColor.value.copy(q.specularColor),q.specularColorMap)D.specularColorMap.value=q.specularColorMap,$(q.specularColorMap,D.specularColorMapTransform);if(q.specularIntensityMap)D.specularIntensityMap.value=q.specularIntensityMap,$(q.specularIntensityMap,D.specularIntensityMapTransform)}function L(D,q){if(q.matcap)D.matcap.value=q.matcap}function I(D,q){let A=Q.get(q).light;D.referencePosition.value.setFromMatrixPosition(A.matrixWorld),D.nearDistance.value=A.shadow.camera.near,D.farDistance.value=A.shadow.camera.far}return{refreshFogUniforms:W,refreshMaterialUniforms:K}}function kN(J,Q,$,W){let K={},Z={},H=[],Y=J.getParameter(J.MAX_UNIFORM_BUFFER_BINDINGS);function X(V,z){let C=z.program;W.uniformBlockBinding(V,C)}function U(V,z){let C=K[V.id];if(C===void 0)D(V),C=N(V),K[V.id]=C,V.addEventListener("dispose",A);let P=z.program;W.updateUBOMapping(V,P);let M=Q.render.frame;if(Z[V.id]!==M)G(V),Z[V.id]=M}function N(V){let z=E();V.__bindingPointIndex=z;let C=J.createBuffer(),P=V.__size,M=V.usage;return J.bindBuffer(J.UNIFORM_BUFFER,C),J.bufferData(J.UNIFORM_BUFFER,P,M),J.bindBuffer(J.UNIFORM_BUFFER,null),J.bindBufferBase(J.UNIFORM_BUFFER,z,C),C}function E(){for(let V=0;V<Y;V++)if(H.indexOf(V)===-1)return H.push(V),V;return T0("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function G(V){let z=K[V.id],C=V.uniforms,P=V.__cache;J.bindBuffer(J.UNIFORM_BUFFER,z);for(let M=0,B=C.length;M<B;M++){let l=C[M];if(Array.isArray(l))for(let h=0,v=l.length;h<v;h++)F(l[h],M,h,P);else F(l,M,0,P)}J.bindBuffer(J.UNIFORM_BUFFER,null)}function F(V,z,C,P){if(I(V,z,C,P)===!0){let{__offset:M,value:B}=V;if(Array.isArray(B)){let l=0;for(let h=0;h<B.length;h++){let v=B[h],r=q(v);if(L(v,V.__data,l),typeof v!=="number"&&typeof v!=="boolean"&&!v.isMatrix3&&!ArrayBuffer.isView(v))l+=r.storage/Float32Array.BYTES_PER_ELEMENT}}else L(B,V.__data,0);J.bufferSubData(J.UNIFORM_BUFFER,M,V.__data)}}function L(V,z,C){if(typeof V==="number"||typeof V==="boolean")z[0]=V;else if(V.isMatrix3)z[0]=V.elements[0],z[1]=V.elements[1],z[2]=V.elements[2],z[3]=0,z[4]=V.elements[3],z[5]=V.elements[4],z[6]=V.elements[5],z[7]=0,z[8]=V.elements[6],z[9]=V.elements[7],z[10]=V.elements[8],z[11]=0;else if(ArrayBuffer.isView(V))z.set(new V.constructor(V.buffer,V.byteOffset,z.length));else V.toArray(z,C)}function I(V,z,C,P){let M=V.value,B=z+"_"+C;if(P[B]===void 0){if(typeof M==="number"||typeof M==="boolean")P[B]=M;else if(ArrayBuffer.isView(M))P[B]=M.slice();else P[B]=M.clone();return!0}else{let l=P[B];if(typeof M==="number"||typeof M==="boolean"){if(l!==M)return P[B]=M,!0}else if(ArrayBuffer.isView(M))return!0;else if(l.equals(M)===!1)return l.copy(M),!0}return!1}function D(V){let z=V.uniforms,C=0,P=16;for(let B=0,l=z.length;B<l;B++){let h=Array.isArray(z[B])?z[B]:[z[B]];for(let v=0,r=h.length;v<r;v++){let S=h[v],d=Array.isArray(S.value)?S.value:[S.value];for(let o=0,m=d.length;o<m;o++){let Q0=d[o],c=q(Q0),a=C%P,J0=a%c.boundary,w0=a+J0;if(C+=J0,w0!==0&&P-w0<c.storage)C+=P-w0;S.__data=new Float32Array(c.storage/Float32Array.BYTES_PER_ELEMENT),S.__offset=C,C+=c.storage}}}let M=C%P;if(M>0)C+=P-M;return V.__size=C,V.__cache={},this}function q(V){let z={boundary:0,storage:0};if(typeof V==="number"||typeof V==="boolean")z.boundary=4,z.storage=4;else if(V.isVector2)z.boundary=8,z.storage=8;else if(V.isVector3||V.isColor)z.boundary=16,z.storage=12;else if(V.isVector4)z.boundary=16,z.storage=16;else if(V.isMatrix3)z.boundary=48,z.storage=48;else if(V.isMatrix4)z.boundary=64,z.storage=64;else if(V.isTexture)P0("WebGLRenderer: Texture samplers can not be part of an uniforms group.");else if(ArrayBuffer.isView(V))z.boundary=16,z.storage=V.byteLength;else P0("WebGLRenderer: Unsupported uniform value type.",V);return z}function A(V){let z=V.target;z.removeEventListener("dispose",A);let C=H.indexOf(z.__bindingPointIndex);H.splice(C,1),J.deleteBuffer(K[z.id]),delete K[z.id],delete Z[z.id]}function y(){for(let V in K)J.deleteBuffer(K[V]);H=[],K={},Z={}}return{bind:X,update:U,dispose:y}}var VN=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),O9=null;function BN(){if(O9===null)O9=new iQ(VN,16,16,e9,E9),O9.name="DFG_LUT",O9.minFilter=xJ,O9.magFilter=xJ,O9.wrapS=u7,O9.wrapT=u7,O9.generateMipmaps=!1,O9.needsUpdate=!0;return O9}class C${constructor(J={}){let{canvas:Q=OK(),context:$=null,depth:W=!0,stencil:K=!1,alpha:Z=!1,antialias:H=!1,premultipliedAlpha:Y=!0,preserveDrawingBuffer:X=!1,powerPreference:U="default",failIfMajorPerformanceCaveat:N=!1,reversedDepthBuffer:E=!1,outputBufferType:G=H9}=J;this.isWebGLRenderer=!0;let F;if($!==null){if(typeof WebGLRenderingContext<"u"&&$ instanceof WebGLRenderingContext)throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");F=$.getContextAttributes().alpha}else F=Z;let L=G,I=new Set([HQ,ZQ,KQ]),D=new Set([H9,p9,Y7,b8,$Q,WQ]),q=new Uint32Array(4),A=new Int32Array(4),y=new f,V=null,z=null,C=[],P=[],M=null;this.domElement=Q,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Z9,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let B=this,l=!1,h=null,v=null,r=null,S=null;this._outputColorSpace=UK;let d=0,o=0,m=null,Q0=-1,c=null,a=new UJ,J0=new UJ,w0=null,z0=new g0(0),QJ=0,v0=Q.width,n=Q.height,$0=1,K0=null,A0=null,_0=new UJ(0,0,v0,n),B0=new UJ(0,0,v0,n),FJ=!1,p0=new K6,l0=!1,o0=!1,d0=new KJ,BJ=new f,HJ=new UJ,hJ={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},DJ=!1;function OJ(){return m===null?$0:1}let _=$;function vJ(R,T){return Q.getContext(R,T)}let n0,XJ,k,O,w,g,e,Z0,X0,u,i,F0,V0,U0,W0,I0,C0,c0,j,H0,s,Y0,D0;try{let R={alpha:!0,depth:W,stencil:K,antialias:H,premultipliedAlpha:Y,preserveDrawingBuffer:X,powerPreference:U,failIfMajorPerformanceCaveat:N};if("setAttribute"in Q)Q.setAttribute("data-engine",`three.js r${MW}`);if(Q.addEventListener("webglcontextlost",y0,!1),Q.addEventListener("webglcontextrestored",$J,!1),Q.addEventListener("webglcontextcreationerror",s0,!1),_===null){if(_=vJ("webgl2",R),_===null)if(vJ("webgl2"))throw Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.");else throw Error("THREE.WebGLRenderer: Error creating WebGL context.")}t()}catch(R){throw Q.removeEventListener("webglcontextlost",y0,!1),Q.removeEventListener("webglcontextrestored",$J,!1),Q.removeEventListener("webglcontextcreationerror",s0,!1),T0("WebGLRenderer: "+R.message),R}function t(){if(n0=new _U(_),n0.init(),s=new DN(_,n0),XJ=new LU(_,n0,J,s),k=new EN(_,n0),XJ.reversedDepthBuffer&&E)k.buffers.depth.setReversed(!0);v=_.createFramebuffer(),r=_.createFramebuffer(),S=_.createFramebuffer(),O=new jU(_),w=new eG,g=new FN(_,n0,k,w,XJ,s,O),e=new wU(B),Z0=new fH(_),Y0=new RU(_,Z0),X0=new TU(_,Z0,O,Y0),u=new fU(_,X0,Z0,Y0,O),c0=new yU(_,XJ,g),W0=new kU(w),i=new tG(B,e,n0,XJ,Y0,W0),F0=new LN(B,w),V0=new QN,U0=new YN(n0),C0=new OU(B,e,k,u,F,Y),I0=new qN(B,u,XJ),D0=new kN(_,O,XJ,k),j=new MU(_,n0,O),H0=new SU(_,n0,O),O.programs=i.programs,B.capabilities=XJ,B.extensions=n0,B.properties=w,B.renderLists=V0,B.shadowMap=I0,B.state=k,B.info=O}if(L!==H9)M=new vU(L,Q.width,Q.height,H,W,K);let N0=new KZ(B,_);this.xr=N0,this.getContext=function(){return _},this.getContextAttributes=function(){return _.getContextAttributes()},this.forceContextLoss=function(){let R=n0.get("WEBGL_lose_context");if(R)R.loseContext()},this.forceContextRestore=function(){let R=n0.get("WEBGL_lose_context");if(R)R.restoreContext()},this.getPixelRatio=function(){return $0},this.setPixelRatio=function(R){if(R===void 0)return;$0=R,this.setSize(v0,n,!1)},this.getSize=function(R){return R.set(v0,n)},this.setSize=function(R,T,p=!0){if(N0.isPresenting){P0("WebGLRenderer: Can't change size while VR device is presenting.");return}if(v0=R,n=T,Q.width=Math.floor(R*$0),Q.height=Math.floor(T*$0),p===!0)Q.style.width=R+"px",Q.style.height=T+"px";if(M!==null)M.setSize(Q.width,Q.height);this.setViewport(0,0,R,T)},this.getDrawingBufferSize=function(R){return R.set(v0*$0,n*$0).floor()},this.setDrawingBufferSize=function(R,T,p){v0=R,n=T,$0=p,Q.width=Math.floor(R*p),Q.height=Math.floor(T*p),this.setViewport(0,0,R,T)},this.setEffects=function(R){if(L===H9){T0("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(R){for(let T=0;T<R.length;T++)if(R[T].isOutputPass===!0){P0("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}M.setEffects(R||[])},this.getCurrentViewport=function(R){return R.copy(a)},this.getViewport=function(R){return R.copy(_0)},this.setViewport=function(R,T,p,b){if(R.isVector4)_0.set(R.x,R.y,R.z,R.w);else _0.set(R,T,p,b);k.viewport(a.copy(_0).multiplyScalar($0).round())},this.getScissor=function(R){return R.copy(B0)},this.setScissor=function(R,T,p,b){if(R.isVector4)B0.set(R.x,R.y,R.z,R.w);else B0.set(R,T,p,b);k.scissor(J0.copy(B0).multiplyScalar($0).round())},this.getScissorTest=function(){return FJ},this.setScissorTest=function(R){k.setScissorTest(FJ=R)},this.setOpaqueSort=function(R){K0=R},this.setTransparentSort=function(R){A0=R},this.getClearColor=function(R){return R.copy(C0.getClearColor())},this.setClearColor=function(){C0.setClearColor(...arguments)},this.getClearAlpha=function(){return C0.getClearAlpha()},this.setClearAlpha=function(){C0.setClearAlpha(...arguments)},this.clear=function(R=!0,T=!0,p=!0){let b=0;if(R){let x=!1;if(m!==null){let E0=m.texture.format;x=I.has(E0)}if(x){let E0=m.texture.type,R0=D.has(E0),q0=C0.getClearColor(),M0=C0.getClearAlpha(),k0=q0.r,f0=q0.g,x0=q0.b;if(R0)q[0]=k0,q[1]=f0,q[2]=x0,q[3]=M0,_.clearBufferuiv(_.COLOR,0,q);else A[0]=k0,A[1]=f0,A[2]=x0,A[3]=M0,_.clearBufferiv(_.COLOR,0,A)}else b|=_.COLOR_BUFFER_BIT}if(T)b|=_.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0);if(p)b|=_.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295);if(b!==0)_.clear(b)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(R){R.setRenderer(this),h=R},this.dispose=function(){Q.removeEventListener("webglcontextlost",y0,!1),Q.removeEventListener("webglcontextrestored",$J,!1),Q.removeEventListener("webglcontextcreationerror",s0,!1),C0.dispose(),V0.dispose(),U0.dispose(),w.dispose(),e.dispose(),u.dispose(),Y0.dispose(),D0.dispose(),i.dispose(),N0.dispose(),N0.removeEventListener("sessionstart",m$),N0.removeEventListener("sessionend",l$),d9.stop()};function y0(R){R.preventDefault(),lQ("WebGLRenderer: Context Lost."),l=!0}function $J(){lQ("WebGLRenderer: Context Restored."),l=!1;let R=O.autoReset,T=I0.enabled,p=I0.autoUpdate,b=I0.needsUpdate,x=I0.type;t(),O.autoReset=R,I0.enabled=T,I0.autoUpdate=p,I0.needsUpdate=b,I0.type=x}function s0(R){T0("WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function U9(R){let T=R.target;T.removeEventListener("dispose",U9),L9(T)}function L9(R){jZ(R),w.remove(R)}function jZ(R){let T=w.get(R).programs;if(T!==void 0){if(T.forEach(function(p){i.releaseProgram(p)}),R.isShaderMaterial)i.releaseShaderCache(R)}}this.renderBufferDirect=function(R,T,p,b,x,E0){if(T===null)T=hJ;let R0=x.isMesh&&x.matrixWorld.determinantAffine()<0,q0=hZ(R,T,p,b,x);k.setMaterial(b,R0);let M0=p.index,k0=1;if(b.wireframe===!0){if(M0=X0.getWireframeAttribute(p),M0===void 0)return;k0=2}let f0=p.drawRange,x0=p.attributes.position,L0=f0.start*k0,i0=(f0.start+f0.count)*k0;if(E0!==null)L0=Math.max(L0,E0.start*k0),i0=Math.min(i0,(E0.start+E0.count)*k0);if(M0!==null)L0=Math.max(L0,0),i0=Math.min(i0,M0.count);else if(x0!==void 0&&x0!==null)L0=Math.max(L0,0),i0=Math.min(i0,x0.count);let NJ=i0-L0;if(NJ<0||NJ===1/0)return;Y0.setup(x,b,q0,p,M0);let YJ,e0=j;if(M0!==null)YJ=Z0.get(M0),e0=H0,e0.setIndex(YJ);if(x.isMesh)if(b.wireframe===!0)k.setLineWidth(b.wireframeLinewidth*OJ()),e0.setMode(_.LINES);else e0.setMode(_.TRIANGLES);else if(x.isLine){let AJ=b.linewidth;if(AJ===void 0)AJ=1;if(k.setLineWidth(AJ*OJ()),x.isLineSegments)e0.setMode(_.LINES);else if(x.isLineLoop)e0.setMode(_.LINE_LOOP);else e0.setMode(_.LINE_STRIP)}else if(x.isPoints)e0.setMode(_.POINTS);else if(x.isSprite)e0.setMode(_.TRIANGLES);if(x.isBatchedMesh)if(!n0.get("WEBGL_multi_draw")){let{_multiDrawStarts:AJ,_multiDrawCounts:O0,_multiDrawCount:jJ}=x,u0=M0?Z0.get(M0).bytesPerElement:1,nJ=w.get(b).currentProgram.getUniforms();for(let G9=0;G9<jJ;G9++)nJ.setValue(_,"_gl_DrawID",G9),e0.render(AJ[G9]/u0,O0[G9])}else e0.renderMultiDraw(x._multiDrawStarts,x._multiDrawCounts,x._multiDrawCount);else if(x.isInstancedMesh)e0.renderInstances(L0,NJ,x.count);else if(p.isInstancedBufferGeometry){let AJ=p._maxInstanceCount!==void 0?p._maxInstanceCount:1/0,O0=Math.min(p.instanceCount,AJ);e0.renderInstances(L0,NJ,O0)}else e0.render(L0,NJ)};function p$(R,T,p,b){if(h!==null&&R.isNodeMaterial)h.setObject(b,R);if(l0===!0)W0.setState(R,p,!1);if(R.transparent===!0&&R.side===aJ&&R.forceSinglePass===!1)R.side=bJ,R.needsUpdate=!0,B7(R,T,b),R.side=f8,R.needsUpdate=!0,B7(R,T,b),R.side=aJ;else B7(R,T,b)}this.compile=function(R,T,p=null){if(p===null)p=R;if(h!==null)h.renderStart(R,T,p);if(z=U0.get(p),z.init(T),P.push(z),p.traverseVisible(function(x){if(x.isLight&&x.layers.test(T.layers)){if(z.pushLight(x),x.castShadow)z.pushShadow(x)}}),R!==p)R.traverseVisible(function(x){if(x.isLight&&x.layers.test(T.layers)){if(z.pushLight(x),x.castShadow)z.pushShadow(x)}});if(z.setupLights(),h!==null)h.updateLights(z.state.lightsArray);if(o0=this.localClippingEnabled,l0=W0.init(this.clippingPlanes,o0),l0===!0)W0.setGlobalState(this.clippingPlanes,T);if(h!==null)I0.render(z.state.shadowsArray,p,T);let b=new Set;if(R.traverse(function(x){if(!(x.isMesh||x.isPoints||x.isLine||x.isSprite))return;let E0=x.material;if(E0)if(Array.isArray(E0))for(let R0=0;R0<E0.length;R0++){let q0=E0[R0];p$(q0,p,T,x),b.add(q0)}else p$(E0,p,T,x),b.add(E0)}),z=P.pop(),h!==null)h.renderEnd();return b},this.compileAsync=function(R,T,p=null){let b=this.compile(R,T,p);return new Promise((x)=>{function E0(){if(b.forEach(function(R0){let M0=w.get(R0).currentProgram;if(M0===void 0||M0.isReady())b.delete(R0)}),b.size===0){x(R);return}setTimeout(E0,10)}if(n0.get("KHR_parallel_shader_compile")!==null)E0();else setTimeout(E0,10)})};let k6=null;function yZ(R){if(k6)k6(R)}function m$(){d9.stop()}function l$(){d9.start()}let d9=new nK;if(d9.setAnimationLoop(yZ),typeof self<"u")d9.setContext(self);this.setAnimationLoop=function(R){k6=R,N0.setAnimationLoop(R),R===null?d9.stop():d9.start()},N0.addEventListener("sessionstart",m$),N0.addEventListener("sessionend",l$),this.render=function(R,T){if(T!==void 0&&T.isCamera!==!0){T0("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(l===!0)return;if(h!==null)h.renderStart(R,T);let p=N0.enabled===!0&&N0.isPresenting===!0,b=M!==null&&(m===null||p)&&M.begin(B,m);if(R.matrixWorldAutoUpdate===!0)R.updateMatrixWorld();if(T.parent===null&&T.matrixWorldAutoUpdate===!0)T.updateMatrixWorld();if(N0.enabled===!0&&N0.isPresenting===!0&&(M===null||M.isCompositing()===!1)){if(N0.cameraAutoUpdate===!0)N0.updateCamera(T);T=N0.getCamera()}if(R.isScene===!0)R.onBeforeRender(B,R,T,m);if(z=U0.get(R,P.length),z.init(T),z.state.textureUnits=g.getTextureUnits(),P.push(z),d0.multiplyMatrices(T.projectionMatrix,T.matrixWorldInverse),p0.setFromProjectionMatrix(d0,mQ,T.reversedDepth),o0=this.localClippingEnabled,l0=W0.init(this.clippingPlanes,o0),V=V0.get(R,C.length),V.init(),C.push(V),N0.enabled===!0&&N0.isPresenting===!0){let R0=B.xr.getDepthSensingMesh();if(R0!==null)V6(R0,T,-1/0,B.sortObjects)}if(V6(R,T,0,B.sortObjects),V.finish(),h!==null)h.updateLights(z.state.lightsArray);if(B.sortObjects===!0)V.sort(K0,A0);if(DJ=N0.enabled===!1||N0.isPresenting===!1||N0.hasDepthSensing()===!1,DJ)C0.addToRenderList(V,R);if(this.info.render.frame++,this.info.autoReset===!0)this.info.reset();if(l0===!0)W0.beginShadows();let x=z.state.shadowsArray;if(I0.render(x,R,T),l0===!0)W0.endShadows();if((b&&M.hasRenderPass())===!1){let{opaque:R0,transmissive:q0}=V;if(z.setupLights(),T.isArrayCamera){let M0=T.cameras;if(q0.length>0)for(let k0=0,f0=M0.length;k0<f0;k0++){let x0=M0[k0];u$(R0,q0,R,x0)}if(DJ)C0.render(R);for(let k0=0,f0=M0.length;k0<f0;k0++){let x0=M0[k0];d$(V,R,x0,x0.viewport)}}else{if(q0.length>0)u$(R0,q0,R,T);if(DJ)C0.render(R);d$(V,R,T)}}if(m!==null&&o===0)g.updateMultisampleRenderTarget(m),g.updateRenderTargetMipmap(m);if(b)M.end(B);if(R.isScene===!0)R.onAfterRender(B,R,T);if(Y0.resetDefaultState(),Q0=-1,c=null,P.pop(),P.length>0){if(z=P[P.length-1],g.setTextureUnits(z.state.textureUnits),l0===!0)W0.setGlobalState(B.clippingPlanes,z.state.camera)}else z=null;if(C.pop(),C.length>0)V=C[C.length-1];else V=null;if(h!==null)h.renderEnd()};function V6(R,T,p,b){if(R.visible===!1)return;if(R.layers.test(T.layers)){if(R.isGroup)p=R.renderOrder;else if(R.isLOD){if(R.autoUpdate===!0)R.update(T)}else if(R.isLightProbeGrid)z.pushLightProbeGrid(R);else if(R.isLight){if(z.pushLight(R),R.castShadow)z.pushShadow(R)}else if(R.isSprite){if(!R.frustumCulled||R.intersectsFrustum(p0)){if(b)HJ.setFromMatrixPosition(R.matrixWorld).applyMatrix4(d0);let R0=u.update(R),q0=R.material;if(q0.visible)V.push(R,R0,q0,p,HJ.z,null,T)}}else if(R.isMesh||R.isLine||R.isPoints){if(!R.frustumCulled||R.intersectsFrustum(p0)){let R0=u.update(R),q0=R.material;if(b){if(R.boundingSphere!==void 0){if(R.boundingSphere===null)R.computeBoundingSphere();HJ.copy(R.boundingSphere.center)}else{if(R0.boundingSphere===null)R0.computeBoundingSphere();HJ.copy(R0.boundingSphere.center)}HJ.applyMatrix4(R.matrixWorld).applyMatrix4(d0)}if(Array.isArray(q0)){let M0=R0.groups;for(let k0=0,f0=M0.length;k0<f0;k0++){let x0=M0[k0],L0=q0[x0.materialIndex];if(L0&&L0.visible)V.push(R,R0,L0,p,HJ.z,x0,T)}}else if(q0.visible)V.push(R,R0,q0,p,HJ.z,null,T)}}}let E0=R.children;for(let R0=0,q0=E0.length;R0<q0;R0++)V6(E0[R0],T,p,b)}function d$(R,T,p,b){let{opaque:x,transmissive:E0,transparent:R0}=R;if(z.setupLightsView(p),l0===!0)W0.setGlobalState(B.clippingPlanes,p);if(b)k.viewport(a.copy(b));if(x.length>0)V7(x,T,p);if(E0.length>0)V7(E0,T,p);if(R0.length>0)V7(R0,T,p);k.buffers.depth.setTest(!0),k.buffers.depth.setMask(!0),k.buffers.color.setMask(!0),k.setPolygonOffset(!1)}function u$(R,T,p,b){if((p.isScene===!0?p.overrideMaterial:null)!==null)return;if(z.state.transmissionRenderTarget[b.id]===void 0){let L0=n0.has("EXT_color_buffer_half_float")||n0.has("EXT_color_buffer_float");z.state.transmissionRenderTarget[b.id]=new cJ(1,1,{generateMipmaps:!0,type:L0?E9:H9,minFilter:a9,samples:Math.max(4,XJ.samples),stencilBuffer:K,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:m0.workingColorSpace})}let E0=z.state.transmissionRenderTarget[b.id],R0=b.viewport||a;E0.setSize(R0.z*B.transmissionResolutionScale,R0.w*B.transmissionResolutionScale);let q0=B.getRenderTarget(),M0=B.getActiveCubeFace(),k0=B.getActiveMipmapLevel();if(B.setRenderTarget(E0),B.getClearColor(z0),QJ=B.getClearAlpha(),QJ<1)B.setClearColor(16777215,0.5);if(B.clear(),DJ)C0.render(p);let f0=B.toneMapping;B.toneMapping=Z9;let x0=b.viewport;if(b.viewport!==void 0)b.viewport=void 0;if(z.setupLightsView(b),l0===!0)W0.setGlobalState(B.clippingPlanes,b);if(V7(R,p,b),g.updateMultisampleRenderTarget(E0),g.updateRenderTargetMipmap(E0),n0.has("WEBGL_multisampled_render_to_texture")===!1){let L0=!1;for(let i0=0,NJ=T.length;i0<NJ;i0++){let YJ=T[i0],{object:e0,geometry:AJ,material:O0,group:jJ}=YJ;if(O0.side===aJ&&e0.layers.test(b.layers)){let u0=O0.side;O0.side=bJ,O0.needsUpdate=!0,c$(e0,p,b,AJ,O0,jJ),O0.side=u0,O0.needsUpdate=!0,L0=!0}}if(L0===!0)g.updateMultisampleRenderTarget(E0),g.updateRenderTargetMipmap(E0)}if(B.setRenderTarget(q0,M0,k0),B.setClearColor(z0,QJ),x0!==void 0)b.viewport=x0;B.toneMapping=f0}function V7(R,T,p){let b=T.isScene===!0?T.overrideMaterial:null;for(let x=0,E0=R.length;x<E0;x++){let R0=R[x],{object:q0,geometry:M0,group:k0}=R0,f0=R0.material;if(f0.allowOverride===!0&&b!==null)f0=b;if(q0.layers.test(p.layers))c$(q0,T,p,M0,f0,k0)}}function c$(R,T,p,b,x,E0){if(h!==null&&x.isNodeMaterial)h.setObject(R,x);if(R.onBeforeRender(B,T,p,b,x,E0),R.modelViewMatrix.multiplyMatrices(p.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),x.onBeforeRender(B,T,p,b,R,E0),x.transparent===!0&&x.side===aJ&&x.forceSinglePass===!1)x.side=bJ,x.needsUpdate=!0,B.renderBufferDirect(p,T,b,x,R,E0),x.side=f8,x.needsUpdate=!0,B.renderBufferDirect(p,T,b,x,R,E0),x.side=aJ;else B.renderBufferDirect(p,T,b,x,R,E0);R.onAfterRender(B,T,p,b,x,E0)}function B7(R,T,p){if(T.isScene!==!0)T=hJ;let b=w.get(R),x=z.state.lights,E0=z.state.shadowsArray,R0=x.state.version,q0=i.getParameters(R,x.state,E0,T,p,z.state.lightProbeGridArray),M0=i.getProgramCacheKey(q0),k0=b.programs;b.environment=R.isMeshStandardMaterial||R.isMeshLambertMaterial||R.isMeshPhongMaterial?T.environment:null,b.fog=T.fog;let f0=R.isMeshStandardMaterial||R.isMeshLambertMaterial&&!R.envMap||R.isMeshPhongMaterial&&!R.envMap;if(b.envMap=e.get(R.envMap||b.environment,f0),b.envMapRotation=b.environment!==null&&R.envMap===null?T.environmentRotation:R.envMapRotation,k0===void 0)R.addEventListener("dispose",U9),k0=new Map,b.programs=k0;let x0=k0.get(M0);if(x0!==void 0){if(b.currentProgram===x0&&b.lightsStateVersion===R0)return s$(R,q0),x0}else{if(q0.uniforms=i.getUniforms(R),h!==null&&R.isNodeMaterial)h.build(R,p,q0);R.onBeforeCompile(q0,B),x0=i.acquireProgram(q0,M0),k0.set(M0,x0),b.uniforms=q0.uniforms}let L0=b.uniforms;if(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)L0.clippingPlanes=W0.uniform;if(s$(R,q0),b.needsLights=bZ(R),b.lightsStateVersion=R0,b.needsLights)L0.ambientLightColor.value=x.state.ambient,L0.lightProbe.value=x.state.probe,L0.sunLights.value=x.state.sun,L0.sunLightShadows.value=x.state.sunShadow,L0.directionalLights.value=x.state.directional,L0.directionalLightShadows.value=x.state.directionalShadow,L0.spotLights.value=x.state.spot,L0.spotLightShadows.value=x.state.spotShadow,L0.rectAreaLights.value=x.state.rectArea,L0.ltc_1.value=x.state.rectAreaLTC1,L0.ltc_2.value=x.state.rectAreaLTC2,L0.pointLights.value=x.state.point,L0.pointLightShadows.value=x.state.pointShadow,L0.hemisphereLights.value=x.state.hemi,L0.sunShadowMatrix.value=x.state.sunShadowMatrix,L0.sunShadowCascade.value=x.state.sunShadowCascade,L0.directionalShadowMatrix.value=x.state.directionalShadowMatrix,L0.spotLightMatrix.value=x.state.spotLightMatrix,L0.spotLightMap.value=x.state.spotLightMap,L0.pointShadowMatrix.value=x.state.pointShadowMatrix;return b.lightProbeGrid=z.state.lightProbeGridArray.length>0,b.currentProgram=x0,b.uniformsList=null,x0}function n$(R){if(R.uniformsList===null){let T=R.currentProgram.getUniforms();R.uniformsList=R7.seqWithValue(T.seq,R.uniforms)}return R.uniformsList}function s$(R,T){let p=w.get(R);p.outputColorSpace=T.outputColorSpace,p.batching=T.batching,p.batchingColor=T.batchingColor,p.instancing=T.instancing,p.instancingColor=T.instancingColor,p.instancingMorph=T.instancingMorph,p.skinning=T.skinning,p.morphTargets=T.morphTargets,p.morphNormals=T.morphNormals,p.morphColors=T.morphColors,p.morphTargetsCount=T.morphTargetsCount,p.numClippingPlanes=T.numClippingPlanes,p.numIntersection=T.numClipIntersection,p.vertexAlphas=T.vertexAlphas,p.vertexTangents=T.vertexTangents,p.toneMapping=T.toneMapping}function fZ(R,T){if(R.length===0)return null;if(R.length===1)return R[0].texture!==null?R[0]:null;y.setFromMatrixPosition(T.matrixWorld);for(let p=0,b=R.length;p<b;p++){let x=R[p];if(x.texture!==null&&x.boundingBox.containsPoint(y))return x}return null}function hZ(R,T,p,b,x){if(T.isScene!==!0)T=hJ;g.resetTextureUnits();let E0=T.fog,R0=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?T.environment:null,q0=m===null?B.outputColorSpace:m.isXRRenderTarget===!0?m.texture.colorSpace:m0.workingColorSpace,M0=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap,k0=e.get(b.envMap||R0,M0),f0=b.vertexColors===!0&&!!p.attributes.color&&p.attributes.color.itemSize===4,x0=!!p.attributes.tangent&&(!!b.normalMap||b.anisotropy>0),L0=!!p.morphAttributes.position,i0=!!p.morphAttributes.normal,NJ=!!p.morphAttributes.color,YJ=Z9;if(b.toneMapped){if(m===null||m.isXRRenderTarget===!0)YJ=B.toneMapping}let e0=p.morphAttributes.position||p.morphAttributes.normal||p.morphAttributes.color,AJ=e0!==void 0?e0.length:0,O0=w.get(b),jJ=z.state.lights;if(l0===!0){if(o0===!0||R!==c){let WJ=R===c&&b.id===Q0;W0.setState(b,R,WJ)}}let u0=!1;if(b.version===O0.__version){if(O0.needsLights&&O0.lightsStateVersion!==jJ.state.version)u0=!0;else if(O0.outputColorSpace!==q0)u0=!0;else if(x.isBatchedMesh&&O0.batching===!1)u0=!0;else if(!x.isBatchedMesh&&O0.batching===!0)u0=!0;else if(x.isBatchedMesh&&O0.batchingColor===!0&&x._colorsTexture===null)u0=!0;else if(x.isBatchedMesh&&O0.batchingColor===!1&&x._colorsTexture!==null)u0=!0;else if(x.isInstancedMesh&&O0.instancing===!1)u0=!0;else if(!x.isInstancedMesh&&O0.instancing===!0)u0=!0;else if(x.isSkinnedMesh&&O0.skinning===!1)u0=!0;else if(!x.isSkinnedMesh&&O0.skinning===!0)u0=!0;else if(x.isInstancedMesh&&O0.instancingColor===!0&&x.instanceColor===null)u0=!0;else if(x.isInstancedMesh&&O0.instancingColor===!1&&x.instanceColor!==null)u0=!0;else if(x.isInstancedMesh&&O0.instancingMorph===!0&&x.morphTexture===null)u0=!0;else if(x.isInstancedMesh&&O0.instancingMorph===!1&&x.morphTexture!==null)u0=!0;else if(O0.envMap!==k0)u0=!0;else if(b.fog===!0&&O0.fog!==E0)u0=!0;else if(O0.numClippingPlanes!==void 0&&(O0.numClippingPlanes!==W0.numPlanes||O0.numIntersection!==W0.numIntersection))u0=!0;else if(O0.vertexAlphas!==f0)u0=!0;else if(O0.vertexTangents!==x0)u0=!0;else if(O0.morphTargets!==L0)u0=!0;else if(O0.morphNormals!==i0)u0=!0;else if(O0.morphColors!==NJ)u0=!0;else if(O0.toneMapping!==YJ)u0=!0;else if(O0.morphTargetsCount!==AJ)u0=!0;else if(!!O0.lightProbeGrid!==z.state.lightProbeGridArray.length>0)u0=!0}else u0=!0,O0.__version=b.version;let nJ=O0.currentProgram;if(u0===!0){if(nJ=B7(b,T,x),h&&b.isNodeMaterial)h.onUpdateProgram(b,nJ,O0)}let G9=!1,_9=!1,E8=!1,t0=nJ.getUniforms(),GJ=O0.uniforms;if(k.useProgram(nJ.program))G9=!0,_9=!0,E8=!0;if(b.id!==Q0)Q0=b.id,_9=!0;if(O0.needsLights){let WJ=fZ(z.state.lightProbeGridArray,x);if(O0.lightProbeGrid!==WJ)O0.lightProbeGrid=WJ,_9=!0}if(G9||c!==R){if(k.buffers.depth.getReversed()&&R.reversedDepth!==!0)R._reversedDepth=!0,R.updateProjectionMatrix();t0.setValue(_,"projectionMatrix",R.projectionMatrix),t0.setValue(_,"viewMatrix",R.matrixWorldInverse);let S9=t0.map.cameraPosition;if(S9!==void 0)S9.setValue(_,BJ.setFromMatrixPosition(R.matrixWorld));if(XJ.logarithmicDepthBuffer)t0.setValue(_,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2));if(b.isMeshPhongMaterial||b.isMeshToonMaterial||b.isMeshLambertMaterial||b.isMeshBasicMaterial||b.isMeshStandardMaterial||b.isShaderMaterial)t0.setValue(_,"isOrthographic",R.isOrthographicCamera===!0);if(c!==R)c=R,_9=!0,E8=!0}if(O0.needsLights){if(jJ.state.sunShadowMap.length>0)t0.setValue(_,"sunShadowMap",jJ.state.sunShadowMap,g);if(jJ.state.directionalShadowMap.length>0)t0.setValue(_,"directionalShadowMap",jJ.state.directionalShadowMap,g);if(jJ.state.spotShadowMap.length>0)t0.setValue(_,"spotShadowMap",jJ.state.spotShadowMap,g);if(jJ.state.pointShadowMap.length>0)t0.setValue(_,"pointShadowMap",jJ.state.pointShadowMap,g)}if(x.isSkinnedMesh){t0.setOptional(_,x,"bindMatrix"),t0.setOptional(_,x,"bindMatrixInverse");let WJ=x.skeleton;if(WJ){if(WJ.boneTexture===null)WJ.computeBoneTexture();t0.setValue(_,"boneTexture",WJ.boneTexture,g)}}if(x.isBatchedMesh){if(t0.setOptional(_,x,"batchingTexture"),t0.setValue(_,"batchingTexture",x._matricesTexture,g),t0.setOptional(_,x,"batchingIdTexture"),t0.setValue(_,"batchingIdTexture",x._indirectTexture,g),t0.setOptional(_,x,"batchingColorTexture"),x._colorsTexture!==null)t0.setValue(_,"batchingColorTexture",x._colorsTexture,g)}let T9=p.morphAttributes;if(T9.position!==void 0||T9.normal!==void 0||T9.color!==void 0)c0.update(x,p,nJ);if(_9||O0.receiveShadow!==x.receiveShadow)O0.receiveShadow=x.receiveShadow,t0.setValue(_,"receiveShadow",x.receiveShadow);if((b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial)&&b.envMap===null&&T.environment!==null)GJ.envMapIntensity.value=T.environmentIntensity;if(GJ.dfgLUT!==void 0)GJ.dfgLUT.value=BN();if(_9){if(t0.setValue(_,"toneMappingExposure",B.toneMappingExposure),O0.needsLights)vZ(GJ,E8);if(E0&&b.fog===!0)F0.refreshFogUniforms(GJ,E0);if(F0.refreshMaterialUniforms(GJ,b,$0,n,z.state.transmissionRenderTarget[R.id]),O0.needsLights&&O0.lightProbeGrid){let WJ=O0.lightProbeGrid;GJ.probesSH.value=WJ.texture,GJ.probesMin.value.copy(WJ.boundingBox.min),GJ.probesMax.value.copy(WJ.boundingBox.max),GJ.probesResolution.value.copy(WJ.resolution)}R7.upload(_,n$(O0),GJ,g)}if(b.isShaderMaterial&&b.uniformsNeedUpdate===!0)R7.upload(_,n$(O0),GJ,g),b.uniformsNeedUpdate=!1;if(b.isSpriteMaterial)t0.setValue(_,"center",x.center);if(t0.setValue(_,"modelViewMatrix",x.modelViewMatrix),t0.setValue(_,"normalMatrix",x.normalMatrix),t0.setValue(_,"modelMatrix",x.matrixWorld),b.uniformsGroups!==void 0){let WJ=b.uniformsGroups;for(let S9=0,F8=WJ.length;S9<F8;S9++){let o$=WJ[S9];D0.update(o$,nJ),D0.bind(o$,nJ)}}return nJ}function vZ(R,T){R.ambientLightColor.needsUpdate=T,R.lightProbe.needsUpdate=T,R.sunLights.needsUpdate=T,R.sunLightShadows.needsUpdate=T,R.directionalLights.needsUpdate=T,R.directionalLightShadows.needsUpdate=T,R.pointLights.needsUpdate=T,R.pointLightShadows.needsUpdate=T,R.spotLights.needsUpdate=T,R.spotLightShadows.needsUpdate=T,R.rectAreaLights.needsUpdate=T,R.hemisphereLights.needsUpdate=T}function bZ(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return d},this.getActiveMipmapLevel=function(){return o},this.getRenderTarget=function(){return m},this.setRenderTargetTextures=function(R,T,p){let b=w.get(R);if(b.__autoAllocateDepthBuffer=R.resolveDepthBuffer===!1,b.__autoAllocateDepthBuffer===!1)b.__useRenderToTexture=!1;w.get(R.texture).__webglTexture=T,w.get(R.depthTexture).__webglTexture=b.__autoAllocateDepthBuffer?void 0:p,b.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(R,T){let p=w.get(R);p.__webglFramebuffer=T,p.__useDefaultFramebuffer=T===void 0},this.setRenderTarget=function(R,T=0,p=0){m=R,d=T,o=p;let b=null,x=!1,E0=!1;if(R){let q0=w.get(R);if(q0.__useDefaultFramebuffer!==void 0){k.bindFramebuffer(_.FRAMEBUFFER,q0.__webglFramebuffer),a.copy(R.viewport),J0.copy(R.scissor),w0=R.scissorTest,k.viewport(a),k.scissor(J0),k.setScissorTest(w0),Q0=-1;return}else if(q0.__webglFramebuffer===void 0)g.setupRenderTarget(R);else if(q0.__hasExternalTextures)g.rebindTextures(R,w.get(R.texture).__webglTexture,w.get(R.depthTexture).__webglTexture);else if(R.depthBuffer){let f0=R.depthTexture;if(q0.__boundDepthTexture!==f0){if(f0!==null&&w.has(f0)&&(R.width!==f0.image.width||R.height!==f0.image.height))throw Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");g.setupDepthRenderbuffer(R)}}let M0=R.texture;if(M0.isData3DTexture||M0.isDataArrayTexture||M0.isCompressedArrayTexture)E0=!0;let k0=w.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget){if(Array.isArray(k0[T]))b=k0[T][p];else b=k0[T];x=!0}else if(R.samples>0&&g.useMultisampledRTT(R)===!1)b=w.get(R).__webglMultisampledFramebuffer;else if(Array.isArray(k0))b=k0[p];else b=k0;a.copy(R.viewport),J0.copy(R.scissor),w0=R.scissorTest}else a.copy(_0).multiplyScalar($0).floor(),J0.copy(B0).multiplyScalar($0).floor(),w0=FJ;if(p!==0)b=v;if(k.bindFramebuffer(_.FRAMEBUFFER,b))k.drawBuffers(R,b);if(k.viewport(a),k.scissor(J0),k.setScissorTest(w0),x){let q0=w.get(R.texture);_.framebufferTexture2D(_.FRAMEBUFFER,_.COLOR_ATTACHMENT0,_.TEXTURE_CUBE_MAP_POSITIVE_X+T,q0.__webglTexture,p)}else if(E0){let q0=T;for(let M0=0;M0<R.textures.length;M0++){let k0=w.get(R.textures[M0]);_.framebufferTextureLayer(_.FRAMEBUFFER,_.COLOR_ATTACHMENT0+M0,k0.__webglTexture,p,q0)}}else if(R!==null&&p!==0){let q0=w.get(R.texture);_.framebufferTexture2D(_.FRAMEBUFFER,_.COLOR_ATTACHMENT0,_.TEXTURE_2D,q0.__webglTexture,p)}Q0=-1};function i$(R){let T=w.get(R);if(T.__readFormat!==R.format||T.__readType!==R.type)T.__readFormat=R.format,T.__readType=R.type,T.__formatReadable=XJ.textureFormatReadable(R.format),T.__typeReadable=XJ.textureTypeReadable(R.type);return T}if(this.readRenderTargetPixels=function(R,T,p,b,x,E0,R0,q0=0){if(!(R&&R.isWebGLRenderTarget)){T0("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let M0=w.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&R0!==void 0)M0=M0[R0];if(M0){k.bindFramebuffer(_.FRAMEBUFFER,M0);try{let k0=R.textures[q0],f0=k0.format,x0=k0.type;if(R.textures.length>1)_.readBuffer(_.COLOR_ATTACHMENT0+q0);let L0=i$(k0);if(L0.__formatReadable===!1){T0("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(L0.__typeReadable===!1){T0("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}if(T>=0&&T<=R.width-b&&(p>=0&&p<=R.height-x))_.readPixels(T,p,b,x,s.convert(f0),s.convert(x0),E0)}finally{let k0=m!==null?w.get(m).__webglFramebuffer:null;k.bindFramebuffer(_.FRAMEBUFFER,k0)}}},this.readRenderTargetPixelsAsync=async function(R,T,p,b,x,E0,R0,q0=0){if(!(R&&R.isWebGLRenderTarget))throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let M0=w.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&R0!==void 0)M0=M0[R0];if(M0)if(T>=0&&T<=R.width-b&&(p>=0&&p<=R.height-x)){k.bindFramebuffer(_.FRAMEBUFFER,M0);let k0=R.textures[q0],f0=k0.format,x0=k0.type;if(R.textures.length>1)_.readBuffer(_.COLOR_ATTACHMENT0+q0);let L0=i$(k0);if(L0.__formatReadable===!1)throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(L0.__typeReadable===!1)throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let i0=_.createBuffer();_.bindBuffer(_.PIXEL_PACK_BUFFER,i0),_.bufferData(_.PIXEL_PACK_BUFFER,E0.byteLength,_.STREAM_READ),_.readPixels(T,p,b,x,s.convert(f0),s.convert(x0),0),_.bindBuffer(_.PIXEL_PACK_BUFFER,null);let NJ=m!==null?w.get(m).__webglFramebuffer:null;k.bindFramebuffer(_.FRAMEBUFFER,NJ);let YJ=_.fenceSync(_.SYNC_GPU_COMMANDS_COMPLETE,0);return _.flush(),await MK(_,YJ,4),_.bindBuffer(_.PIXEL_PACK_BUFFER,i0),_.getBufferSubData(_.PIXEL_PACK_BUFFER,0,E0),_.bindBuffer(_.PIXEL_PACK_BUFFER,null),_.deleteBuffer(i0),_.deleteSync(YJ),E0}else throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(R,T=null,p=0){let b=Math.pow(2,-p),x=Math.floor(R.image.width*b),E0=Math.floor(R.image.height*b),R0=T!==null?T.x:0,q0=T!==null?T.y:0;g.setTexture2D(R,0),_.copyTexSubImage2D(_.TEXTURE_2D,p,0,0,R0,q0,x,E0),k.unbindTexture()},this.copyTextureToTexture=function(R,T,p=null,b=null,x=0,E0=0){let R0,q0,M0,k0,f0,x0,L0,i0,NJ,YJ=R.isCompressedTexture?R.mipmaps[E0]:R.image;if(p!==null)R0=p.max.x-p.min.x,q0=p.max.y-p.min.y,M0=p.isBox3?p.max.z-p.min.z:1,k0=p.min.x,f0=p.min.y,x0=p.isBox3?p.min.z:0;else{let GJ=Math.pow(2,-x);if(R0=Math.floor(YJ.width*GJ),q0=Math.floor(YJ.height*GJ),R.isDataArrayTexture)M0=YJ.depth;else if(R.isData3DTexture)M0=Math.floor(YJ.depth*GJ);else M0=1;k0=0,f0=0,x0=0}if(b!==null)L0=b.x,i0=b.y,NJ=b.z;else L0=0,i0=0,NJ=0;let e0=s.convert(T.format),AJ=s.convert(T.type),O0;if(T.isData3DTexture)g.setTexture3D(T,0),O0=_.TEXTURE_3D;else if(T.isDataArrayTexture||T.isCompressedArrayTexture)g.setTexture2DArray(T,0),O0=_.TEXTURE_2D_ARRAY;else g.setTexture2D(T,0),O0=_.TEXTURE_2D;k.activeTexture(_.TEXTURE0),k.pixelStorei(_.UNPACK_FLIP_Y_WEBGL,T.flipY),k.pixelStorei(_.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),k.pixelStorei(_.UNPACK_ALIGNMENT,T.unpackAlignment);let jJ=k.getParameter(_.UNPACK_ROW_LENGTH),u0=k.getParameter(_.UNPACK_IMAGE_HEIGHT),nJ=k.getParameter(_.UNPACK_SKIP_PIXELS),G9=k.getParameter(_.UNPACK_SKIP_ROWS),_9=k.getParameter(_.UNPACK_SKIP_IMAGES);k.pixelStorei(_.UNPACK_ROW_LENGTH,YJ.width),k.pixelStorei(_.UNPACK_IMAGE_HEIGHT,YJ.height),k.pixelStorei(_.UNPACK_SKIP_PIXELS,k0),k.pixelStorei(_.UNPACK_SKIP_ROWS,f0),k.pixelStorei(_.UNPACK_SKIP_IMAGES,x0);let E8=R.isDataArrayTexture||R.isData3DTexture,t0=T.isDataArrayTexture||T.isData3DTexture;if(R.isDepthTexture){let GJ=w.get(R),T9=w.get(T),WJ=w.get(GJ.__renderTarget),S9=w.get(T9.__renderTarget);k.bindFramebuffer(_.READ_FRAMEBUFFER,WJ.__webglFramebuffer),k.bindFramebuffer(_.DRAW_FRAMEBUFFER,S9.__webglFramebuffer);for(let F8=0;F8<M0;F8++){if(E8)_.framebufferTextureLayer(_.READ_FRAMEBUFFER,_.COLOR_ATTACHMENT0,w.get(R).__webglTexture,x,x0+F8),_.framebufferTextureLayer(_.DRAW_FRAMEBUFFER,_.COLOR_ATTACHMENT0,w.get(T).__webglTexture,E0,NJ+F8);_.blitFramebuffer(k0,f0,R0,q0,L0,i0,R0,q0,_.DEPTH_BUFFER_BIT,_.NEAREST)}k.bindFramebuffer(_.READ_FRAMEBUFFER,null),k.bindFramebuffer(_.DRAW_FRAMEBUFFER,null)}else if(x!==0||R.isRenderTargetTexture||w.has(R)){let GJ=w.get(R),T9=w.get(T);k.bindFramebuffer(_.READ_FRAMEBUFFER,r),k.bindFramebuffer(_.DRAW_FRAMEBUFFER,S);for(let WJ=0;WJ<M0;WJ++){if(E8)_.framebufferTextureLayer(_.READ_FRAMEBUFFER,_.COLOR_ATTACHMENT0,GJ.__webglTexture,x,x0+WJ);else _.framebufferTexture2D(_.READ_FRAMEBUFFER,_.COLOR_ATTACHMENT0,_.TEXTURE_2D,GJ.__webglTexture,x);if(t0)_.framebufferTextureLayer(_.DRAW_FRAMEBUFFER,_.COLOR_ATTACHMENT0,T9.__webglTexture,E0,NJ+WJ);else _.framebufferTexture2D(_.DRAW_FRAMEBUFFER,_.COLOR_ATTACHMENT0,_.TEXTURE_2D,T9.__webglTexture,E0);if(x!==0)_.blitFramebuffer(k0,f0,R0,q0,L0,i0,R0,q0,_.COLOR_BUFFER_BIT,_.NEAREST);else if(t0)_.copyTexSubImage3D(O0,E0,L0,i0,NJ+WJ,k0,f0,R0,q0);else _.copyTexSubImage2D(O0,E0,L0,i0,k0,f0,R0,q0)}k.bindFramebuffer(_.READ_FRAMEBUFFER,null),k.bindFramebuffer(_.DRAW_FRAMEBUFFER,null)}else if(t0)if(R.isDataTexture||R.isData3DTexture)_.texSubImage3D(O0,E0,L0,i0,NJ,R0,q0,M0,e0,AJ,YJ.data);else if(T.isCompressedArrayTexture)_.compressedTexSubImage3D(O0,E0,L0,i0,NJ,R0,q0,M0,e0,YJ.data);else _.texSubImage3D(O0,E0,L0,i0,NJ,R0,q0,M0,e0,AJ,YJ);else if(R.isDataTexture)_.texSubImage2D(_.TEXTURE_2D,E0,L0,i0,R0,q0,e0,AJ,YJ.data);else if(R.isCompressedTexture)_.compressedTexSubImage2D(_.TEXTURE_2D,E0,L0,i0,YJ.width,YJ.height,e0,YJ.data);else _.texSubImage2D(_.TEXTURE_2D,E0,L0,i0,R0,q0,e0,AJ,YJ);if(k.pixelStorei(_.UNPACK_ROW_LENGTH,jJ),k.pixelStorei(_.UNPACK_IMAGE_HEIGHT,u0),k.pixelStorei(_.UNPACK_SKIP_PIXELS,nJ),k.pixelStorei(_.UNPACK_SKIP_ROWS,G9),k.pixelStorei(_.UNPACK_SKIP_IMAGES,_9),E0===0&&T.generateMipmaps)_.generateMipmap(O0);k.unbindTexture()},this.initRenderTarget=function(R){if(w.get(R).__webglFramebuffer===void 0)g.setupRenderTarget(R)},this.initTexture=function(R){if(R.isCubeTexture)g.setTextureCube(R,0);else if(R.isData3DTexture)g.setTexture3D(R,0);else if(R.isDataArrayTexture||R.isCompressedArrayTexture)g.setTexture2DArray(R,0);else g.setTexture2D(R,0);k.unbindTexture()},this.resetState=function(){d=0,o=0,m=null,k.reset(),Y0.reset()},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return mQ}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(J){this._outputColorSpace=J;let Q=this.getContext();Q.drawingBufferColorSpace=m0._getDrawingBufferColorSpace(J),Q.unpackColorSpace=m0._getUnpackColorSpace()}}var HZ={type:"change"},w$={type:"start"},XZ={type:"end"},D6=new p8,YZ=new iJ,zN=Math.cos(70*uQ.DEG2RAD),LJ=new f,pJ=2*Math.PI,r0={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},P$=0.000001;class _$ extends G6{constructor(J,Q=null){super(J,Q);if(this.state=r0.NONE,this.target=new f,this.cursor=new f,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=0.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:K9.ROTATE,MIDDLE:K9.DOLLY,RIGHT:K9.PAN},this.touches={ONE:x9.ROTATE,TWO:x9.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new f,this._lastQuaternion=new rJ,this._lastTargetPosition=new f,this._quat=new rJ().setFromUnitVectors(J.up,new f(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new E7,this._sphericalDelta=new E7,this._scale=1,this._panOffset=new f,this._rotateStart=new S0,this._rotateEnd=new S0,this._rotateDelta=new S0,this._panStart=new S0,this._panEnd=new S0,this._panDelta=new S0,this._dollyStart=new S0,this._dollyEnd=new S0,this._dollyDelta=new S0,this._dollyDirection=new f,this._mouse=new S0,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=CN.bind(this),this._onPointerDown=AN.bind(this),this._onPointerUp=PN.bind(this),this._onContextMenu=fN.bind(this),this._onMouseWheel=TN.bind(this),this._onKeyDown=SN.bind(this),this._onTouchStart=jN.bind(this),this._onTouchMove=yN.bind(this),this._onMouseDown=wN.bind(this),this._onMouseMove=_N.bind(this),this._interceptControlDown=hN.bind(this),this._interceptControlUp=vN.bind(this),this.domElement!==null)this.connect(this.domElement);this.update()}set cursorStyle(J){if(this._cursorStyle=J,J==="grab")this.domElement.style.cursor="grab";else this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(J){super.connect(J),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=r0.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents();let J=this.domElement.getRootNode();J.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),J.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(J){J.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=J}stopListenToKeyEvents(){if(this._domElementKeyEvents!==null)this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(HZ),this.update(),this.state=r0.NONE}pan(J,Q){this._pan(J,Q),this.update()}dollyIn(J){this._dollyIn(J),this.update()}dollyOut(J){this._dollyOut(J),this.update()}rotateLeft(J){this._rotateLeft(J),this.update()}rotateUp(J){this._rotateUp(J),this.update()}update(J=null){let Q=this.object.position;if(LJ.copy(Q).sub(this.target),LJ.applyQuaternion(this._quat),this._spherical.setFromVector3(LJ),this.autoRotate&&this.state===r0.NONE)this._rotateLeft(this._getAutoRotationAngle(J));if(this.enableDamping)this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor;else this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi;let $=this.minAzimuthAngle,W=this.maxAzimuthAngle;if(isFinite($)&&isFinite(W)){if($<-Math.PI)$+=pJ;else if($>Math.PI)$-=pJ;if(W<-Math.PI)W+=pJ;else if(W>Math.PI)W-=pJ;if($<=W)this._spherical.theta=Math.max($,Math.min(W,this._spherical.theta));else this._spherical.theta=this._spherical.theta>($+W)/2?Math.max($,this._spherical.theta):Math.min(W,this._spherical.theta)}if(this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0)this.target.addScaledVector(this._panOffset,this.dampingFactor);else this.target.add(this._panOffset);this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let K=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let Z=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),K=Z!=this._spherical.radius}if(LJ.setFromSpherical(this._spherical),LJ.applyQuaternion(this._quatInverse),Q.copy(this.target).add(LJ),this.object.lookAt(this.target),this.enableDamping===!0)this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor);else this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0);if(this.zoomToCursor&&this._performCursorZoom){let Z=null;if(this.object.isPerspectiveCamera){let H=LJ.length();Z=this._clampDistance(H*this._scale);let Y=H-Z;this.object.position.addScaledVector(this._dollyDirection,Y),this.object.updateMatrixWorld(),K=!!Y}else if(this.object.isOrthographicCamera){let H=new f(this._mouse.x,this._mouse.y,0);H.unproject(this.object);let Y=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),K=Y!==this.object.zoom;let X=new f(this._mouse.x,this._mouse.y,0);X.unproject(this.object),this.object.position.sub(X).add(H),this.object.updateMatrixWorld(),Z=LJ.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;if(Z!==null)if(this.screenSpacePanning)this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(Z).add(this.object.position);else if(D6.origin.copy(this.object.position),D6.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(D6.direction))<zN)this.object.lookAt(this.target);else YZ.setFromNormalAndCoplanarPoint(this.object.up,this.target),D6.intersectPlane(YZ,this.target)}else if(this.object.isOrthographicCamera){let Z=this.object.zoom;if(this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),Z!==this.object.zoom)this.object.updateProjectionMatrix(),K=!0}if(this._scale=1,this._performCursorZoom=!1,K||this._lastPosition.distanceToSquared(this.object.position)>P$||8*(1-this._lastQuaternion.dot(this.object.quaternion))>P$||this._lastTargetPosition.distanceToSquared(this.target)>P$)return this.dispatchEvent(HZ),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0;return!1}_getAutoRotationAngle(J){if(J!==null)return pJ/60*this.autoRotateSpeed*J;else return pJ/60/60*this.autoRotateSpeed}_getZoomScale(J){let Q=Math.abs(J*0.01);return Math.pow(0.95,this.zoomSpeed*Q)}_rotateLeft(J){this._sphericalDelta.theta-=J}_rotateUp(J){this._sphericalDelta.phi-=J}_panLeft(J,Q){LJ.setFromMatrixColumn(Q,0),LJ.multiplyScalar(-J),this._panOffset.add(LJ)}_panUp(J,Q){if(this.screenSpacePanning===!0)LJ.setFromMatrixColumn(Q,1);else LJ.setFromMatrixColumn(Q,0),LJ.crossVectors(this.object.up,LJ);LJ.multiplyScalar(J),this._panOffset.add(LJ)}_pan(J,Q){let $=this.domElement;if(this.object.isPerspectiveCamera){let W=this.object.position;LJ.copy(W).sub(this.target);let K=LJ.length();K*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*J*K/$.clientHeight,this.object.matrix),this._panUp(2*Q*K/$.clientHeight,this.object.matrix)}else if(this.object.isOrthographicCamera)this._panLeft(J*(this.object.right-this.object.left)/this.object.zoom/$.clientWidth,this.object.matrix),this._panUp(Q*(this.object.top-this.object.bottom)/this.object.zoom/$.clientHeight,this.object.matrix);else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1}_dollyOut(J){if(this.object.isPerspectiveCamera||this.object.isOrthographicCamera)this._scale/=J;else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1}_dollyIn(J){if(this.object.isPerspectiveCamera||this.object.isOrthographicCamera)this._scale*=J;else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1}_updateZoomParameters(J,Q){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let $=this.domElement.getBoundingClientRect(),W=J-$.left,K=Q-$.top,Z=$.width,H=$.height;this._mouse.x=W/Z*2-1,this._mouse.y=-(K/H)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(J){return Math.max(this.minDistance,Math.min(this.maxDistance,J))}_handleMouseDownRotate(J){this._rotateStart.set(J.clientX,J.clientY)}_handleMouseDownDolly(J){this._updateZoomParameters(J.clientX,J.clientX),this._dollyStart.set(J.clientX,J.clientY)}_handleMouseDownPan(J){this._panStart.set(J.clientX,J.clientY)}_handleMouseMoveRotate(J){this._rotateEnd.set(J.clientX,J.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let Q=this.domElement;this._rotateLeft(pJ*this._rotateDelta.x/Q.clientHeight),this._rotateUp(pJ*this._rotateDelta.y/Q.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(J){if(this._dollyEnd.set(J.clientX,J.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0)this._dollyOut(this._getZoomScale(this._dollyDelta.y));else if(this._dollyDelta.y<0)this._dollyIn(this._getZoomScale(this._dollyDelta.y));this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(J){this._panEnd.set(J.clientX,J.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(J){if(this._updateZoomParameters(J.clientX,J.clientY),J.deltaY<0)this._dollyIn(this._getZoomScale(J.deltaY));else if(J.deltaY>0)this._dollyOut(this._getZoomScale(J.deltaY));this.update()}_handleKeyDown(J){let Q=!1;switch(J.code){case this.keys.UP:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateUp(pJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(0,this.keyPanSpeed);Q=!0;break;case this.keys.BOTTOM:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateUp(-pJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(0,-this.keyPanSpeed);Q=!0;break;case this.keys.LEFT:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateLeft(pJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(this.keyPanSpeed,0);Q=!0;break;case this.keys.RIGHT:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateLeft(-pJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(-this.keyPanSpeed,0);Q=!0;break}if(Q)J.preventDefault(),this.update()}_handleTouchStartRotate(J){if(this._pointers.length===1)this._rotateStart.set(J.pageX,J.pageY);else{let Q=this._getSecondPointerPosition(J),$=0.5*(J.pageX+Q.x),W=0.5*(J.pageY+Q.y);this._rotateStart.set($,W)}}_handleTouchStartPan(J){if(this._pointers.length===1)this._panStart.set(J.pageX,J.pageY);else{let Q=this._getSecondPointerPosition(J),$=0.5*(J.pageX+Q.x),W=0.5*(J.pageY+Q.y);this._panStart.set($,W)}}_handleTouchStartDolly(J){let Q=this._getSecondPointerPosition(J),$=J.pageX-Q.x,W=J.pageY-Q.y,K=Math.sqrt($*$+W*W);this._dollyStart.set(0,K)}_handleTouchStartDollyPan(J){if(this.enableZoom)this._handleTouchStartDolly(J);if(this.enablePan)this._handleTouchStartPan(J)}_handleTouchStartDollyRotate(J){if(this.enableZoom)this._handleTouchStartDolly(J);if(this.enableRotate)this._handleTouchStartRotate(J)}_handleTouchMoveRotate(J){if(this._pointers.length==1)this._rotateEnd.set(J.pageX,J.pageY);else{let $=this._getSecondPointerPosition(J),W=0.5*(J.pageX+$.x),K=0.5*(J.pageY+$.y);this._rotateEnd.set(W,K)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let Q=this.domElement;this._rotateLeft(pJ*this._rotateDelta.x/Q.clientHeight),this._rotateUp(pJ*this._rotateDelta.y/Q.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(J){if(this._pointers.length===1)this._panEnd.set(J.pageX,J.pageY);else{let Q=this._getSecondPointerPosition(J),$=0.5*(J.pageX+Q.x),W=0.5*(J.pageY+Q.y);this._panEnd.set($,W)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(J){let Q=this._getSecondPointerPosition(J),$=J.pageX-Q.x,W=J.pageY-Q.y,K=Math.sqrt($*$+W*W);this._dollyEnd.set(0,K),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let Z=(J.pageX+Q.x)*0.5,H=(J.pageY+Q.y)*0.5;this._updateZoomParameters(Z,H)}_handleTouchMoveDollyPan(J){if(this.enableZoom)this._handleTouchMoveDolly(J);if(this.enablePan)this._handleTouchMovePan(J)}_handleTouchMoveDollyRotate(J){if(this.enableZoom)this._handleTouchMoveDolly(J);if(this.enableRotate)this._handleTouchMoveRotate(J)}_addPointer(J){this._pointers.push(J.pointerId)}_removePointer(J){delete this._pointerPositions[J.pointerId];for(let Q=0;Q<this._pointers.length;Q++)if(this._pointers[Q]==J.pointerId){this._pointers.splice(Q,1);return}}_isTrackingPointer(J){for(let Q=0;Q<this._pointers.length;Q++)if(this._pointers[Q]==J.pointerId)return!0;return!1}_trackPointer(J){let Q=this._pointerPositions[J.pointerId];if(Q===void 0)Q=new S0,this._pointerPositions[J.pointerId]=Q;Q.set(J.pageX,J.pageY)}_getSecondPointerPosition(J){let Q=J.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[Q]}_customWheelEvent(J){let Q=J.deltaMode,$={clientX:J.clientX,clientY:J.clientY,deltaY:J.deltaY};switch(Q){case 1:$.deltaY*=16;break;case 2:$.deltaY*=100;break}if(J.ctrlKey&&!this._controlActive)$.deltaY*=10;return $}}function AN(J){if(this.enabled===!1)return;if(this._pointers.length===0)this.domElement.setPointerCapture(J.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp);if(this._isTrackingPointer(J))return;if(this._addPointer(J),J.pointerType==="touch")this._onTouchStart(J);else this._onMouseDown(J);if(this._cursorStyle==="grab")this.domElement.style.cursor="grabbing"}function CN(J){if(this.enabled===!1)return;if(J.pointerType==="touch")this._onTouchMove(J);else this._onMouseMove(J)}function PN(J){switch(this._removePointer(J),this._pointers.length){case 0:if(this.domElement.releasePointerCapture(J.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(XZ),this.state=r0.NONE,this._cursorStyle==="grab")this.domElement.style.cursor="grab";break;case 1:let Q=this._pointers[0],$=this._pointerPositions[Q];this._onTouchStart({pointerId:Q,pageX:$.x,pageY:$.y});break}}function wN(J){let Q;switch(J.button){case 0:Q=this.mouseButtons.LEFT;break;case 1:Q=this.mouseButtons.MIDDLE;break;case 2:Q=this.mouseButtons.RIGHT;break;default:Q=-1}switch(Q){case K9.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(J),this.state=r0.DOLLY;break;case K9.ROTATE:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(J),this.state=r0.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(J),this.state=r0.ROTATE}break;case K9.PAN:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(J),this.state=r0.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(J),this.state=r0.PAN}break;default:this.state=r0.NONE}if(this.state!==r0.NONE)this.dispatchEvent(w$)}function _N(J){switch(this.state){case r0.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(J);break;case r0.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(J);break;case r0.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(J);break}}function TN(J){if(this.enabled===!1||this.enableZoom===!1||this.state!==r0.NONE)return;J.preventDefault(),this.dispatchEvent(w$),this._handleMouseWheel(this._customWheelEvent(J)),this.dispatchEvent(XZ)}function SN(J){if(this.enabled===!1)return;this._handleKeyDown(J)}function jN(J){switch(this._trackPointer(J),this._pointers.length){case 1:switch(this.touches.ONE){case x9.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(J),this.state=r0.TOUCH_ROTATE;break;case x9.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(J),this.state=r0.TOUCH_PAN;break;default:this.state=r0.NONE}break;case 2:switch(this.touches.TWO){case x9.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(J),this.state=r0.TOUCH_DOLLY_PAN;break;case x9.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(J),this.state=r0.TOUCH_DOLLY_ROTATE;break;default:this.state=r0.NONE}break;default:this.state=r0.NONE}if(this.state!==r0.NONE)this.dispatchEvent(w$)}function yN(J){switch(this._trackPointer(J),this.state){case r0.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(J),this.update();break;case r0.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(J),this.update();break;case r0.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(J),this.update();break;case r0.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(J),this.update();break;default:this.state=r0.NONE}}function fN(J){if(this.enabled===!1)return;J.preventDefault()}function hN(J){if(J.key==="Control")this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0})}function vN(J){if(J.key==="Control")this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0})}class O6 extends _J{constructor(J=document.createElement("div")){super();this.isCSS2DObject=!0,this.element=J,this.element.style.position="absolute",this.element.style.userSelect="none",this.element.setAttribute("draggable",!1),this.center=new S0(0.5,0.5),this.rotation2D=0,this.addEventListener("removed",function(){this.traverse(function(Q){if(Q.element&&Q.element instanceof Q.element.ownerDocument.defaultView.Element&&Q.element.parentNode!==null)Q.element.remove()})})}copy(J,Q){return super.copy(J,Q),this.element=J.element.cloneNode(!0),this.center=J.center,this.rotation2D=J.rotation2D,this}}var c8=new f,UZ=new KJ,GZ=new KJ,NZ=new f,qZ=new f;class T${constructor(J={}){let Q=this,$,W,K,Z,H={objects:new WeakMap},Y=J.element!==void 0?J.element:document.createElement("div");Y.style.overflow="hidden",this.domElement=Y,this.sortObjects=!0,this.getSize=function(){return{width:$,height:W}},this.render=function(F,L){if(F.matrixWorldAutoUpdate===!0)F.updateMatrixWorld();if(L.parent===null&&L.matrixWorldAutoUpdate===!0)L.updateMatrixWorld();if(UZ.copy(L.matrixWorldInverse),GZ.multiplyMatrices(L.projectionMatrix,UZ),U(F,F,L),this.sortObjects)G(F)},this.setSize=function(F,L){$=F,W=L,K=$/2,Z=W/2,Y.style.width=F+"px",Y.style.height=L+"px"};function X(F){if(F.isCSS2DObject)F.element.style.display="none";for(let L=0,I=F.children.length;L<I;L++)X(F.children[L])}function U(F,L,I){if(F.visible===!1){X(F);return}if(F.isCSS2DObject){c8.setFromMatrixPosition(F.matrixWorld),c8.applyMatrix4(GZ);let D=c8.z>=-1&&c8.z<=1&&F.layers.test(I.layers)===!0,q=F.element;if(q.style.display=D===!0?"":"none",D===!0){F.onBeforeRender(Q,L,I);let y=100*F.center.x,V=100*F.center.y;q.style.transformOrigin=`${y}% ${V}%`;let z=-F.rotation2D,C=c8.x*K+K,P=-c8.y*Z+Z;if(q.style.transform=`translate(${-y}%, ${-V}%) translate(${C}px, ${P}px) rotate(${z}rad)`,q.parentNode!==Y)Y.appendChild(q);F.onAfterRender(Q,L,I)}let A={distanceToCameraSquared:N(I,F)};H.objects.set(F,A)}for(let D=0,q=F.children.length;D<q;D++)U(F.children[D],L,I)}function N(F,L){return NZ.setFromMatrixPosition(F.matrixWorld),qZ.setFromMatrixPosition(L.matrixWorld),NZ.distanceToSquared(qZ)}function E(F){let L=[];return F.traverseVisible(function(I){if(I.isCSS2DObject)L.push(I)}),L}function G(F){let L=E(F).sort(function(D,q){if(D.renderOrder!==q.renderOrder)return q.renderOrder-D.renderOrder;let A=H.objects.get(D).distanceToCameraSquared,y=H.objects.get(q).distanceToCameraSquared;return A-y}),I=L.length;for(let D=0,q=L.length;D<q;D++)L[D].element.style.zIndex=I-D}}}function EZ(J,Q=2400){let $={flow:0,step:0,progress:0,playing:!1,finished:!1},W=()=>J[$.flow]?.steps[$.step]??null;function K(){Object.assign($,{step:0,progress:0,playing:!1,finished:!1})}return{state:$,current:W,choose(Z){if(!Number.isInteger(Z)||!J[Z])return!1;return $.flow=Z,K(),!0},restart:K,pause(){$.playing=!1},play(){if(!W())return;if($.finished)K();$.playing=!0},step(){if($.playing=!1,!W())return;if($.step+1<J[$.flow].steps.length)$.step++,$.progress=0,$.finished=!1;else $.progress=1,$.finished=!0},tick(Z){if(!$.playing||!W()||!Number.isFinite(Z)||Z<=0)return;$.progress+=Z/Q;while($.progress>=1){if($.step+1===J[$.flow].steps.length){$.progress=1,$.playing=!1,$.finished=!0;break}$.progress--,$.step++}}}}function FZ(J,Q){if(!J.length)return null;let $=J.slice(1).map((Z,H)=>Math.hypot(Z.x-J[H].x,Z.z-J[H].z)),W=$.reduce((Z,H)=>Z+H,0),K=Math.max(0,Math.min(1,Q))*W;for(let Z=0;Z<$.length;Z++){if(K<=$[Z]&&$[Z]>0){let H=K/$[Z];return{x:J[Z].x+(J[Z+1].x-J[Z].x)*H,z:J[Z].z+(J[Z+1].z-J[Z].z)*H}}K-=$[Z]}return{...J.at(-1)}}var VJ=window.ATLAS_SCENE;if(!VJ?.nodes?.length)throw Error("Prism needs at least one component");var G8=document.getElementById("stage"),l9=document.getElementById("gl"),OZ=document.getElementById("labels"),o8=new C$({canvas:l9,antialias:!0});o8.setPixelRatio(Math.min(devicePixelRatio,2));var RZ=new T$({element:OZ}),X9=new Q6,ZJ=new m8(-1,1,1,-1,0.1,1000),fJ=new _$(ZJ,l9);fJ.enableDamping=!1;fJ.maxPolarAngle=Math.PI/2-0.08;fJ.minPolarAngle=0.08;fJ.minZoom=0.3;fJ.maxZoom=8;fJ.mouseButtons.LEFT=K9.PAN;fJ.mouseButtons.RIGHT=K9.ROTATE;fJ.screenSpacePanning=!0;var EJ={theme:"dark",selected:null,view:"all",tab:"does",projection:"infra"},eJ=EZ(VJ.flows||[]),f$=[],MZ={dark:{paper:867181,ink:15660799,accent:8384767,warm:16757086},light:{paper:15988732,ink:801387,accent:25256,warm:9851136}},M9={uPaper:{value:new g0},uInk:{value:new g0},uAccent:{value:new g0},uWarm:{value:new g0},uSelected:{value:-1},uPixelRatio:{value:o8.getPixelRatio()},uWorldPixel:{value:0.05},uTraceNode:{value:-1}},h$="#include <colorspace_fragment>",P9=new Y9,LZ=[],kZ=[],VZ=[],BZ=[],R6=new Map(VJ.nodes.map((J)=>[J.id,J])),mJ=(J)=>String(J??"").replace(/[&<>"']/g,(Q)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[Q]),IZ=new SJ({uniforms:M9,vertexShader:`varying vec2 vGround;
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
      ${h$}
    }`}),L6=new zJ(new W8(2000,2000),IZ);L6.rotation.x=-Math.PI/2;L6.position.y=-0.03;X9.add(L6);var zZ=new SJ({uniforms:M9,vertexShader:`attribute vec2 aFaceUv, aHatch; attribute float aFace, aIndex, aRemoved;
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
      ${h$}
    }`}),U8={position:[],aFaceUv:[],aHatch:[],aFace:[],aIndex:[],aRemoved:[]};function n8(J,Q,$,W,K,Z){let H=[[0,0],[1,0],[1,1],[0,1]];for(let Y of[0,1,2,0,2,3])U8.position.push(...J[Y]),U8.aFaceUv.push(...H[Y]),U8.aHatch.push(H[Y][0]*Q,H[Y][1]*$),U8.aFace.push(W),U8.aIndex.push(K),U8.aRemoved.push(Z)}VJ.nodes.forEach((J,Q)=>{let{x:$,z:W}=J,K=$+J.w,Z=W+J.d,H=Math.max(0.08,J.h),Y=J.state==="removed"?1:0;if(P9.expandByPoint(new f($,0,W)),P9.expandByPoint(new f(K,H,Z)),n8([[$,H,W],[$,H,Z],[K,H,Z],[K,H,W]],J.d,J.w,0,Q,Y),n8([[K,0,W],[$,0,W],[$,H,W],[K,H,W]],J.w,H,1,Q,Y),n8([[K,0,Z],[K,0,W],[K,H,W],[K,H,Z]],J.d,H,1,Q,Y),n8([[$,0,Z],[K,0,Z],[K,H,Z],[$,H,Z]],J.w,H,1,Q,Y),n8([[$,0,W],[$,0,Z],[$,H,Z],[$,H,W]],J.d,H,1,Q,Y),J.type==="database")for(let E of[0.3,0.6]){let G=H*E;n8([[$,G,W],[$,G,Z],[K,G,Z],[K,G,W]],J.d,J.w,0,Q,Y)}let X=new zJ(new m9(J.w,H,J.d),new Q8({visible:!1}));X.position.set($+J.w/2,H/2,W+J.d/2),X.userData.id=J.id,LZ.push(X),X9.add(X);let U=document.createElement("button");U.className="plabel"+(Y?" gone":""),U.innerHTML="<b>"+mJ(J.code)+"</b>",U.title=J.name,U.dataset.node=J.id,U.addEventListener("pointerdown",(E)=>E.stopPropagation()),U.addEventListener("click",()=>L7(J.id));let N=new O6(U);N.position.set($+J.w/2,H+0.04,W+J.d/2),X9.add(N),kZ.push({element:U,object:N,id:J.id})});var AZ=new gJ;for(let[J,Q]of Object.entries(U8))AZ.setAttribute(J,new IJ(Q,J==="position"?3:["aFaceUv","aHatch"].includes(J)?2:1));X9.add(new zJ(AZ,zZ));var bN=new SJ({uniforms:{...M9,uTrace:{value:0}},transparent:!0,depthWrite:!1,side:aJ,vertexShader:`attribute vec3 aOffset; attribute float aDistance,aSide,aKind;
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
      ${h$}
    }`});function CZ(J,Q,$=1.5,W=!1){let K={position:[],aOffset:[],aDistance:[],aSide:[],aKind:[]},Z=(N,E,G,F,L=Q)=>{K.position.push(N.x,N.y,N.z),K.aOffset.push(E.x,E.y,E.z),K.aDistance.push(G),K.aSide.push(F),K.aKind.push(L)},H=0;for(let N=1;N<J.length;N++){let E=J[N-1],G=J[N],F=G.clone().sub(E),L=F.length();if(L<0.00001)continue;F.divideScalar(L);let I=new f(-F.z,0,F.x).multiplyScalar($/2);for(let[D,q,A]of[[E,1,H],[E,-1,H],[G,1,H+L],[G,1,H+L],[E,-1,H],[G,-1,H+L]])Z(D,I.clone().multiplyScalar(q),A,q);H+=L}if(W&&J.length>1){let N=J.at(-1),E=N.clone().sub(J.at(-2)).normalize(),G=new f(-E.z,0,E.x);for(let F of[new f,E.clone().multiplyScalar(-7).addScaledVector(G,3),E.clone().multiplyScalar(-7).addScaledVector(G,-3)])Z(N,F,0,0,Q===1?1:0)}let Y=new gJ;for(let[N,E]of Object.entries(K))Y.setAttribute(N,new IJ(E,["position","aOffset"].includes(N)?3:1));let X=bN.clone();X.uniforms={...M9,uTrace:{value:0}};let U=new zJ(Y,X);return U.frustumCulled=!1,X9.add(U),U}function PZ(J,Q,$){let W=document.createElement("div");W.className=$,W.textContent=J;let K=new O6(W);return K.position.copy(Q),X9.add(K),{element:W,object:K}}for(let J of VJ.zones){let Q=[[J.x0,J.z0],[J.x1,J.z0],[J.x1,J.z1],[J.x0,J.z1],[J.x0,J.z0]].map(([$,W])=>new f($,0.01,W));Q.forEach(($)=>P9.expandByPoint($)),CZ(Q,3,1.3),BZ.push(PZ(J.label,new f(J.x0,0.1,J.z0),"zlabel"))}for(let J of VJ.routes){let Q=J.points.map(($)=>new f($.x,0.025,$.z));if(Q.forEach(($)=>P9.expandByPoint($)),f$.push(CZ(Q,J.variant,3,!0)),J.label){let $=0,W=Q[0];for(let K=1;K<Q.length;K++){let Z=Q[K].distanceTo(Q[K-1]);if(Z>$)$=Z,W=Q[K].clone().add(Q[K-1]).multiplyScalar(0.5)}VZ.push({...PZ(J.label,W.clone().setY(0.08),"elabel"),from:J.from,to:J.to})}}var w9=new zJ(new q7(1,12,8),new Q8({color:MZ.dark.accent,depthTest:!1,depthWrite:!1}));w9.visible=!1;w9.renderOrder=20;w9.userData.excludeFit=!0;X9.add(w9);var xN=new f(1,Math.sqrt(0.6666666666666666),1).normalize();function v$(J=P9){let Q=J.getCenter(new f);fJ.minPolarAngle=EJ.projection==="flow"?0.000001:0.08,fJ.enableRotate=EJ.projection==="infra",fJ.target.copy(Q),ZJ.position.copy(Q).addScaledVector(EJ.projection==="flow"?new f(0,1,0.000001):xN,100),ZJ.zoom=1,ZJ.lookAt(Q),ZJ.updateMatrixWorld();let $=new Y9,W=new f;if(J===P9)for(let E of X9.children){if(E===L6||!E.geometry||E.userData.excludeFit)continue;let G=E.geometry.attributes.position;for(let F=0;F<G.count;F++)W.fromBufferAttribute(G,F).applyMatrix4(E.matrixWorld).applyMatrix4(ZJ.matrixWorldInverse),$.expandByPoint(W)}else for(let E of[J.min.x,J.max.x])for(let G of[J.min.y,J.max.y])for(let F of[J.min.z,J.max.z])$.expandByPoint(W.set(E,G,F).applyMatrix4(ZJ.matrixWorldInverse));let K=$.getCenter(new f).setZ(0).applyQuaternion(ZJ.quaternion);fJ.target.add(K),ZJ.position.add(K),ZJ.updateMatrixWorld();let Z=($.max.x-$.min.x)/2,H=($.max.y-$.min.y)/2,Y=G8.clientWidth,X=G8.clientHeight,U=36,N=Math.max(2*Z/Math.max(1,Y-2*U),2*H/Math.max(1,X-2*U));ZJ.left=-Y*N/2,ZJ.right=-ZJ.left,ZJ.top=X*N/2,ZJ.bottom=-ZJ.top,ZJ.updateProjectionMatrix(),fJ.update(),N8()}function b$(){let J=VJ.views.find(($)=>$.id===EJ.view);if(!J?.nodes?.length)return P9;let Q=new Y9;for(let $ of J.nodes){let W=R6.get($);if(W)Q.expandByPoint(new f(W.x,0,W.z)),Q.expandByPoint(new f(W.x+W.w,W.h,W.z+W.d))}return Q.isEmpty()?P9:Q}function wZ(){let{clientWidth:J,clientHeight:Q}=G8;if(!J||!Q)return;o8.setSize(J,Q,!1),RZ.setSize(J,Q),v$(b$())}function x$(J){EJ.view=J,document.querySelectorAll(".ch").forEach((Q)=>Q.setAttribute("aria-pressed",String(Q.dataset.view===J))),v$(b$())}var i8=document.getElementById("side"),S$=document.getElementById("pb");for(let J of new Set(VJ.nodes.map((Q)=>Q.group))){let Q=VJ.nodes.filter((W)=>W.group===J),$=document.createElement("div");$.className="gh",$.innerHTML="<span>"+mJ(J)+"</span><span>"+Q.length+"</span>",i8.append($);for(let W of Q){let K=document.createElement("button");K.className="row"+(W.state==="removed"?" ghost":""),K.dataset.node=W.id,K.innerHTML='<span class="cd">'+mJ(W.code)+'</span><span class="nm">'+mJ(W.name)+"</span>",K.addEventListener("click",()=>{L7(W.id),i8.classList.remove("open")}),i8.append(K)}}var _Z=document.getElementById("chapters");_Z.innerHTML='<span class="lbl">Views</span>';for(let J of VJ.views){let Q=document.createElement("button");Q.className="ch",Q.dataset.view=J.id,Q.textContent=J.label,Q.setAttribute("aria-pressed",String(J.id==="all")),Q.addEventListener("click",()=>x$(J.id)),_Z.append(Q)}function g$(){let J=R6.get(EJ.selected);if(document.getElementById("selected-heading").textContent=J?J.code+" · "+J.name:"System overview",!J){S$.innerHTML=VJ.introHtml;return}let Q=EJ.tab==="does"?J.does:J.built;S$.innerHTML='<div class="k">'+mJ(J.group)+'</div><h2 class="pt">'+mJ(J.name)+'</h2><p class="ps">'+mJ(J.code)+" · "+mJ(J.type)+'</p><div class="k">'+(EJ.tab==="does"?"What it does":"How it is built")+"</div><p>"+mJ(Q)+'</p><dl class="facts">'+J.facts.map(([W,K])=>"<dt>"+mJ(W)+"</dt><dd>"+mJ(K)+"</dd>").join("")+"</dl>";let $=VJ.routes.filter((W)=>W.from===J.id||W.to===J.id);S$.innerHTML+='<div class="k">Connections</div><div class="cxs">'+$.map((W)=>'<div class="cx"><span class="cxa">'+mJ(R6.get(W.from).code)+'</span><span>→</span><span class="cxa">'+mJ(R6.get(W.to).code)+'</span><span class="cxl">'+mJ(W.label)+"</span></div>").join("")+"</div>"}function L7(J){EJ.selected=J,M9.uSelected.value=VJ.nodes.findIndex((Q)=>Q.id===J),document.querySelectorAll("[data-node]").forEach((Q)=>Q.classList.toggle("on",Q.dataset.node===J)),g$(),N8()}for(let J of["does","built"])document.getElementById("t"+J).addEventListener("click",()=>{EJ.tab=J;for(let Q of["does","built"])document.getElementById("t"+Q).setAttribute("aria-selected",String(J===Q));g$()});for(let J of["reset","mreset"])document.getElementById(J).addEventListener("click",()=>{L7(null),x$("all")});document.getElementById("export").addEventListener("click",()=>{N8();let J=document.createElement("canvas");J.width=l9.width,J.height=l9.height;let Q=J.getContext("2d");Q.drawImage(l9,0,0);let $=G8.getBoundingClientRect(),W=J.width/$.width;Q.scale(W,W);for(let K of OZ.children){let Z=getComputedStyle(K),H=K.getBoundingClientRect();if(Z.display==="none"||Z.visibility==="hidden"||H.right<$.left||H.left>$.right||H.bottom<$.top||H.top>$.bottom)continue;Q.fillStyle=Z.backgroundColor,Q.fillRect(H.left-$.left,H.top-$.top,H.width,H.height);let Y=getComputedStyle(K.querySelector("b")||K);Q.font=Y.font,Q.fillStyle=Z.color,Q.textAlign="center",Q.textBaseline="middle",Q.fillText(K.textContent,H.left-$.left+H.width/2,H.top-$.top+H.height/2)}J.toBlob((K)=>{if(!K)return;let Z=URL.createObjectURL(K),H=document.createElement("a");H.href=Z,H.download="atlas-prism.png",H.click(),setTimeout(()=>URL.revokeObjectURL(Z),1000)},"image/png")});for(let J of["theme","mtheme"])document.getElementById(J).addEventListener("click",()=>TZ(EJ.theme==="dark"?"light":"dark"));document.getElementById("menuBtn").addEventListener("click",()=>i8.classList.add("open"));document.getElementById("sideClose").addEventListener("click",()=>i8.classList.remove("open"));document.getElementById("grab").addEventListener("click",()=>document.getElementById("mid").classList.toggle("expanded"));window.addEventListener("keydown",(J)=>{if(J.key==="Escape")L7(null),x$("all"),i8.classList.remove("open")});var DZ=new U6,M6=null;l9.addEventListener("pointerdown",(J)=>{M6={x:J.clientX,y:J.clientY}});l9.addEventListener("click",(J)=>{if(!M6||Math.hypot(J.clientX-M6.x,J.clientY-M6.y)>4)return;let Q=l9.getBoundingClientRect();DZ.setFromCamera(new S0((J.clientX-Q.left)/Q.width*2-1,1-(J.clientY-Q.top)/Q.height*2),ZJ),L7(DZ.intersectObjects(LZ)[0]?.object.userData.id??null)});function TZ(J){EJ.theme=J;let Q=MZ[J];for(let $ of["Paper","Ink","Accent","Warm"])M9["u"+$].value.setHex(Q[$.toLowerCase()]);o8.setClearColor(Q.paper),document.documentElement.dataset.theme=J,document.getElementById("theme").textContent=J==="dark"?"Light":"Dark",N8()}function N8(){M9.uWorldPixel.value=(ZJ.top-ZJ.bottom)/(Math.max(1,G8.clientHeight)*ZJ.zoom),w9.scale.setScalar(M9.uWorldPixel.value*4),w9.material.color.copy(M9.uAccent.value),o8.render(X9,ZJ),RZ.render(X9,ZJ);let J=[];for(let{element:$}of kZ){let W=$.getBoundingClientRect();J.push(W)}let Q=($,W)=>$.left<W.right+6&&$.right>W.left-6&&$.top<W.bottom+4&&$.bottom>W.top-4;for(let $ of BZ){$.element.style.visibility="visible";let W=$.element.getBoundingClientRect();if(J.some((K)=>Q(W,K)))$.element.style.visibility="hidden";else J.push(W)}for(let $ of VZ){let W=EJ.projection==="flow"||ZJ.zoom>=1.35||$.from===EJ.selected||$.to===EJ.selected;if($.element.style.visibility=W?"visible":"hidden",W){let K=$.element.getBoundingClientRect();if(J.some((Z)=>Q(K,Z)))$.element.style.visibility="hidden";else J.push(K)}}document.getElementById("zoomnote").classList.toggle("show",ZJ.zoom<1.35&&!EJ.selected)}var M7=0,s8=null,j$=document.getElementById("flow-select"),y$=document.getElementById("play");for(let[J,Q]of(VJ.flows||[]).entries()){let $=document.createElement("option");$.value=J,$.textContent=Q.label,j$.append($)}function q8(){let J=eJ.current(),Q=eJ.state;y$.textContent=Q.playing?"Pause":"Play",y$.setAttribute("aria-pressed",String(Q.playing));let $=document.getElementById("flow-status");if($.textContent=J?`${Q.step+1} / ${VJ.flows[Q.flow].steps.length} · ${J.title}${Q.finished?" · Complete":""}`:"No authored flows",document.getElementById("flow-story").textContent=J?.story||"",M9.uTraceNode.value=J?VJ.nodes.findIndex((W)=>W.id===J.to):-1,f$.forEach((W,K)=>{W.material.uniforms.uTrace.value=J?.route===K?1:0}),w9.visible=!!J,J){let W=FZ(VJ.routes[J.route].points,Q.progress);w9.position.set(W.x,0.09,W.z)}N8()}function k7(){cancelAnimationFrame(M7),M7=0,s8=null}function SZ(J){if(M7=0,s8!==null)eJ.tick(J-s8);if(s8=J,q8(),eJ.state.playing)M7=requestAnimationFrame(SZ);else s8=null}j$.addEventListener("change",()=>{k7(),eJ.choose(Number(j$.value)),q8()});y$.addEventListener("click",()=>{if(eJ.state.playing)eJ.pause(),k7();else eJ.play(),s8=null,M7=requestAnimationFrame(SZ);q8()});document.getElementById("step").addEventListener("click",()=>{k7(),eJ.step(),q8()});document.getElementById("restart-flow").addEventListener("click",()=>{k7(),eJ.restart(),q8()});for(let J of document.querySelectorAll("[data-projection]"))J.addEventListener("click",()=>{EJ.projection=J.dataset.projection,document.querySelectorAll("[data-projection]").forEach((Q)=>Q.setAttribute("aria-pressed",String(Q.dataset.projection===EJ.projection))),document.getElementById("projection-note").textContent=EJ.projection==="flow"?"Atlas · Flow / top view":"Atlas · 2:1 dimetric",v$(b$())});document.addEventListener("visibilitychange",()=>{if(document.hidden)eJ.pause(),k7(),q8()});for(let J of["flow-select","play","step","restart-flow"])document.getElementById(J).disabled=!VJ.flows?.length;fJ.addEventListener("change",N8);new ResizeObserver(wZ).observe(G8);g$();TZ("dark");wZ();q8();window.AtlasPrism={renderer:o8,scene:X9,camera:ZJ,controls:fJ,state:EJ,sceneBounds:P9,prismMaterial:zZ,gridMaterial:IZ,render:N8,playback:eJ,routeMeshes:f$,flowDot:w9};})();
