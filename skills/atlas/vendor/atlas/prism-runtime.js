(()=>{var XW="186",f9={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},v9={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},HW=0,f6=1,UW=2;var a8=1,GW=2,C8=3,w8=0,bJ=1,uJ=2,U9=0,r8=1,v6=2,h6=3,b6=4,NW=5;var _8=100,qW=101,FW=102,DW=103,EW=104,OW=200,RW=201,kW=202,MW=203,LW=204,VW=205,BW=206,IW=207,zW=208,AW=209,PW=210,CW=211,wW=212,_W=213,TW=214,SW=0,jW=1,yW=2,x6=3,fW=4,vW=5,hW=6,bW=7,xW=0,gW=1,pW=2,W9=0,g6=1,p6=2,m6=3,l6=4,d6=5,u6=6,c6=7;var T8=301,i9=302,S7=303,j7=304,t8=306,mW=1000,y7=1001,lW=1002,h9=1003,dW=1004;var e8=1005;var xJ=1006,f7=1007;var o9=1008;var Z9=1009,uW=1010,cW=1011,J7=1012,n6=1013,b9=1014,I9=1015,G9=1016,s6=1017,i6=1018,S8=1020,nW=35902,sW=35899,iW=1021,oW=1022,N9=1023,a9=1026,r9=1027,aW=1028,o6=1029,t9=1030,a6=1031;var r6=1033,v7=33776,h7=33777,b7=33778,x7=33779,t6=35840,e6=35841,JQ=35842,QQ=35843,$Q=36196,WQ=37492,ZQ=37496,KQ=37488,YQ=37489,g7=37490,XQ=37491,HQ=37808,UQ=37809,GQ=37810,NQ=37811,qQ=37812,FQ=37813,DQ=37814,EQ=37815,OQ=37816,RQ=37817,kQ=37818,MQ=37819,LQ=37820,VQ=37821,BQ=36492,IQ=36494,zQ=36495,AQ=36283,PQ=36284,p7=36285,CQ=36286;var wQ=0,rW=1,e9="",tW="srgb",_Q="srgb-linear",TQ="linear",$J="srgb";var eW=512,JZ=513,QZ=514,m7=515,$Z=516,WZ=517,l7=518,ZZ=519;var SQ="300 es",jQ=2000;function CK(J){for(let Q=J.length-1;Q>=0;--Q)if(J[Q]>=65535)return!0;return!1}function wK(J){return ArrayBuffer.isView(J)&&!(J instanceof DataView)}function o8(J){return document.createElementNS("http://www.w3.org/1999/xhtml",J)}function KZ(){let J=o8("canvas");return J.style.display="block",J}var g$={},A8=null;function yQ(...J){let Q="THREE."+J.shift();if(A8)A8("log",Q,...J);else console.log(Q,...J)}function YZ(J){let Q=J[0];if(typeof Q==="string"&&Q.startsWith("TSL:")){let $=J[1];if($&&$.isStackTrace)J[0]+=" "+$.getLocation();else J[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return J}function w0(...J){J=YZ(J);let Q="THREE."+J.shift();if(A8)A8("warn",Q,...J);else{let $=J[0];if($&&$.isStackTrace)console.warn($.getError(Q));else console.warn(Q,...J)}}function S0(...J){J=YZ(J);let Q="THREE."+J.shift();if(A8)A8("error",Q,...J);else{let $=J[0];if($&&$.isStackTrace)console.error($.getError(Q));else console.error(Q,...J)}}function s9(...J){let Q=J.join(" ");if(Q in g$)return;g$[Q]=!0,w0(...J)}function XZ(J,Q,$){return new Promise(function(W,Z){function K(){switch(J.clientWaitSync(Q,J.SYNC_FLUSH_COMMANDS_BIT,0)){case J.WAIT_FAILED:Z();break;case J.TIMEOUT_EXPIRED:setTimeout(K,$);break;default:W()}}setTimeout(K,$)})}var HZ={[0]:1,[2]:6,[4]:7,[3]:5,[1]:0,[6]:2,[7]:4,[5]:3};class q9{addEventListener(J,Q){if(this._listeners===void 0)this._listeners={};let $=this._listeners;if($[J]===void 0)$[J]=[];if($[J].indexOf(Q)===-1)$[J].push(Q)}hasEventListener(J,Q){let $=this._listeners;if($===void 0)return!1;return $[J]!==void 0&&$[J].indexOf(Q)!==-1}removeEventListener(J,Q){let $=this._listeners;if($===void 0)return;let W=$[J];if(W!==void 0){let Z=W.indexOf(Q);if(Z!==-1)W.splice(Z,1)}}dispatchEvent(J){let Q=this._listeners;if(Q===void 0)return;let $=Q[J.type];if($!==void 0){J.target=this;let W=$.slice(0);for(let Z=0,K=W.length;Z<K;Z++)W[Z].call(this,J);J.target=null}}}var PJ=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],p$=1234567,s8=Math.PI/180,P8=180/Math.PI;function j8(){let J=Math.random()*4294967295|0,Q=Math.random()*4294967295|0,$=Math.random()*4294967295|0,W=Math.random()*4294967295|0;return(PJ[J&255]+PJ[J>>8&255]+PJ[J>>16&255]+PJ[J>>24&255]+"-"+PJ[Q&255]+PJ[Q>>8&255]+"-"+PJ[Q>>16&15|64]+PJ[Q>>24&255]+"-"+PJ[$&63|128]+PJ[$>>8&255]+"-"+PJ[$>>16&255]+PJ[$>>24&255]+PJ[W&255]+PJ[W>>8&255]+PJ[W>>16&255]+PJ[W>>24&255]).toLowerCase()}function x0(J,Q,$){return Math.max(Q,Math.min($,J))}function fQ(J,Q){return(J%Q+Q)%Q}function _K(J,Q,$,W,Z){return W+(J-Q)*(Z-W)/($-Q)}function TK(J,Q,$){if(J!==Q)return($-J)/(Q-J);else return 0}function i8(J,Q,$){return(1-$)*J+$*Q}function SK(J,Q,$,W){return i8(J,Q,1-Math.exp(-$*W))}function jK(J,Q=1){return Q-Math.abs(fQ(J,Q*2)-Q)}function yK(J,Q,$){if(J<=Q)return 0;if(J>=$)return 1;return J=(J-Q)/($-Q),J*J*(3-2*J)}function fK(J,Q,$){if(J<=Q)return 0;if(J>=$)return 1;return J=(J-Q)/($-Q),J*J*J*(J*(J*6-15)+10)}function vK(J,Q){return J+Math.floor(Math.random()*(Q-J+1))}function hK(J,Q){return J+Math.random()*(Q-J)}function bK(J){return J*(0.5-Math.random())}function xK(J){if(J!==void 0)p$=J;let Q=p$+=1831565813;return Q=Math.imul(Q^Q>>>15,Q|1),Q^=Q+Math.imul(Q^Q>>>7,Q|61),((Q^Q>>>14)>>>0)/4294967296}function gK(J){return J*s8}function pK(J){return J*P8}function mK(J){return J>0&&Number.isInteger(J)&&2**Math.round(Math.log2(J))===J}function lK(J){return Math.pow(2,Math.ceil(Math.log(J)/Math.LN2))}function dK(J){return Math.pow(2,Math.floor(Math.log(J)/Math.LN2))}function uK(J,Q,$,W,Z){let{cos:K,sin:Y}=Math,X=K($/2),H=Y($/2),U=K((Q+W)/2),N=Y((Q+W)/2),E=K((Q-W)/2),G=Y((Q-W)/2),D=K((W-Q)/2),M=Y((W-Q)/2);switch(Z){case"XYX":J.set(X*N,H*E,H*G,X*U);break;case"YZY":J.set(H*G,X*N,H*E,X*U);break;case"ZXZ":J.set(H*E,H*G,X*N,X*U);break;case"XZX":J.set(X*N,H*M,H*D,X*U);break;case"YXY":J.set(H*D,X*N,H*M,X*U);break;case"ZYZ":J.set(H*M,H*D,X*N,X*U);break;default:w0("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+Z)}}function B8(J,Q){switch(Q.constructor){case Float32Array:return J;case Uint32Array:return J/4294967295;case Uint16Array:return J/65535;case Uint8Array:case Uint8ClampedArray:return J/255;case Int32Array:return Math.max(J/2147483647,-1);case Int16Array:return Math.max(J/32767,-1);case Int8Array:return Math.max(J/127,-1);default:throw Error("THREE.MathUtils: Invalid component type.")}}function yJ(J,Q){switch(Q.constructor){case Float32Array:return J;case Uint32Array:return Math.round(J*4294967295);case Uint16Array:return Math.round(J*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(J*255);case Int32Array:return Math.round(J*2147483647);case Int16Array:return Math.round(J*32767);case Int8Array:return Math.round(J*127);default:throw Error("THREE.MathUtils: Invalid component type.")}}var vQ={DEG2RAD:s8,RAD2DEG:P8,generateUUID:j8,clamp:x0,euclideanModulo:fQ,mapLinear:_K,inverseLerp:TK,lerp:i8,damp:SK,pingpong:jK,smoothstep:yK,smootherstep:fK,randInt:vK,randFloat:hK,randFloatSpread:bK,seededRandom:xK,degToRad:gK,radToDeg:pK,isPowerOfTwo:mK,ceilPowerOfTwo:lK,floorPowerOfTwo:dK,setQuaternionFromProperEuler:uK,normalize:yJ,denormalize:B8};class j0{static{j0.prototype.isVector2=!0}constructor(J=0,Q=0){this.x=J,this.y=Q}get width(){return this.x}set width(J){this.x=J}get height(){return this.y}set height(J){this.y=J}set(J,Q){return this.x=J,this.y=Q,this}setScalar(J){return this.x=J,this.y=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;default:throw Error("THREE.Vector2: index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;default:throw Error("THREE.Vector2: index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y)}copy(J){return this.x=J.x,this.y=J.y,this}add(J){return this.x+=J.x,this.y+=J.y,this}addScalar(J){return this.x+=J,this.y+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this}subScalar(J){return this.x-=J,this.y-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this}multiply(J){return this.x*=J.x,this.y*=J.y,this}multiplyScalar(J){return this.x*=J,this.y*=J,this}divide(J){return this.x/=J.x,this.y/=J.y,this}divideScalar(J){return this.multiplyScalar(1/J)}applyMatrix3(J){let Q=this.x,$=this.y,W=J.elements;return this.x=W[0]*Q+W[3]*$+W[6],this.y=W[1]*Q+W[4]*$+W[7],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this}clamp(J,Q){return this.x=x0(this.x,J.x,Q.x),this.y=x0(this.y,J.y,Q.y),this}clampScalar(J,Q){return this.x=x0(this.x,J,Q),this.y=x0(this.y,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(x0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(J){return this.x*J.x+this.y*J.y}cross(J){return this.x*J.y-this.y*J.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(J){let Q=Math.sqrt(this.lengthSq()*J.lengthSq());if(Q===0)return Math.PI/2;let $=this.dot(J)/Q;return Math.acos(x0($,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let Q=this.x-J.x,$=this.y-J.y;return Q*Q+$*$}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this}equals(J){return J.x===this.x&&J.y===this.y}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this}rotateAround(J,Q){let $=Math.cos(Q),W=Math.sin(Q),Z=this.x-J.x,K=this.y-J.y;return this.x=Z*$-K*W+J.x,this.y=Z*W+K*$+J.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class aJ{constructor(J=0,Q=0,$=0,W=1){this.isQuaternion=!0,this._x=J,this._y=Q,this._z=$,this._w=W}static slerpFlat(J,Q,$,W,Z,K,Y){let X=$[W+0],H=$[W+1],U=$[W+2],N=$[W+3],E=Z[K+0],G=Z[K+1],D=Z[K+2],M=Z[K+3];if(N!==M||X!==E||H!==G||U!==D){let I=X*E+H*G+U*D+N*M;if(I<0)E=-E,G=-G,D=-D,M=-M,I=-I;let F=1-Y;if(I<0.9995){let q=Math.acos(I),A=Math.sin(q);F=Math.sin(F*q)/A,Y=Math.sin(Y*q)/A,X=X*F+E*Y,H=H*F+G*Y,U=U*F+D*Y,N=N*F+M*Y}else{X=X*F+E*Y,H=H*F+G*Y,U=U*F+D*Y,N=N*F+M*Y;let q=1/Math.sqrt(X*X+H*H+U*U+N*N);X*=q,H*=q,U*=q,N*=q}}J[Q]=X,J[Q+1]=H,J[Q+2]=U,J[Q+3]=N}static multiplyQuaternionsFlat(J,Q,$,W,Z,K){let Y=$[W],X=$[W+1],H=$[W+2],U=$[W+3],N=Z[K],E=Z[K+1],G=Z[K+2],D=Z[K+3];return J[Q]=Y*D+U*N+X*G-H*E,J[Q+1]=X*D+U*E+H*N-Y*G,J[Q+2]=H*D+U*G+Y*E-X*N,J[Q+3]=U*D-Y*N-X*E-H*G,J}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get w(){return this._w}set w(J){this._w=J,this._onChangeCallback()}set(J,Q,$,W){return this._x=J,this._y=Q,this._z=$,this._w=W,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(J){return this._x=J.x,this._y=J.y,this._z=J.z,this._w=J.w,this._onChangeCallback(),this}setFromEuler(J,Q=!0){let{_x:$,_y:W,_z:Z,_order:K}=J,Y=Math.cos,X=Math.sin,H=Y($/2),U=Y(W/2),N=Y(Z/2),E=X($/2),G=X(W/2),D=X(Z/2);switch(K){case"XYZ":this._x=E*U*N+H*G*D,this._y=H*G*N-E*U*D,this._z=H*U*D+E*G*N,this._w=H*U*N-E*G*D;break;case"YXZ":this._x=E*U*N+H*G*D,this._y=H*G*N-E*U*D,this._z=H*U*D-E*G*N,this._w=H*U*N+E*G*D;break;case"ZXY":this._x=E*U*N-H*G*D,this._y=H*G*N+E*U*D,this._z=H*U*D+E*G*N,this._w=H*U*N-E*G*D;break;case"ZYX":this._x=E*U*N-H*G*D,this._y=H*G*N+E*U*D,this._z=H*U*D-E*G*N,this._w=H*U*N+E*G*D;break;case"YZX":this._x=E*U*N+H*G*D,this._y=H*G*N+E*U*D,this._z=H*U*D-E*G*N,this._w=H*U*N-E*G*D;break;case"XZY":this._x=E*U*N-H*G*D,this._y=H*G*N-E*U*D,this._z=H*U*D+E*G*N,this._w=H*U*N+E*G*D;break;default:w0("Quaternion: .setFromEuler() encountered an unknown order: "+K)}if(Q===!0)this._onChangeCallback();return this}setFromAxisAngle(J,Q){let $=Q/2,W=Math.sin($);return this._x=J.x*W,this._y=J.y*W,this._z=J.z*W,this._w=Math.cos($),this._onChangeCallback(),this}setFromRotationMatrix(J){let Q=J.elements,$=Q[0],W=Q[4],Z=Q[8],K=Q[1],Y=Q[5],X=Q[9],H=Q[2],U=Q[6],N=Q[10],E=$+Y+N;if(E>0){let G=0.5/Math.sqrt(E+1);this._w=0.25/G,this._x=(U-X)*G,this._y=(Z-H)*G,this._z=(K-W)*G}else if($>Y&&$>N){let G=2*Math.sqrt(1+$-Y-N);this._w=(U-X)/G,this._x=0.25*G,this._y=(W+K)/G,this._z=(Z+H)/G}else if(Y>N){let G=2*Math.sqrt(1+Y-$-N);this._w=(Z-H)/G,this._x=(W+K)/G,this._y=0.25*G,this._z=(X+U)/G}else{let G=2*Math.sqrt(1+N-$-Y);this._w=(K-W)/G,this._x=(Z+H)/G,this._y=(X+U)/G,this._z=0.25*G}return this._onChangeCallback(),this}setFromUnitVectors(J,Q){let $=J.dot(Q)+1;if($<0.00000001)if($=0,Math.abs(J.x)>Math.abs(J.z))this._x=-J.y,this._y=J.x,this._z=0,this._w=$;else this._x=0,this._y=-J.z,this._z=J.y,this._w=$;else this._x=J.y*Q.z-J.z*Q.y,this._y=J.z*Q.x-J.x*Q.z,this._z=J.x*Q.y-J.y*Q.x,this._w=$;return this.normalize()}angleTo(J){return 2*Math.acos(Math.abs(x0(this.dot(J),-1,1)))}rotateTowards(J,Q){let $=this.angleTo(J);if($===0)return this;let W=Math.min(1,Q/$);return this.slerp(J,W),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(J){return this._x*J._x+this._y*J._y+this._z*J._z+this._w*J._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let J=this.length();if(J===0)this._x=0,this._y=0,this._z=0,this._w=1;else J=1/J,this._x=this._x*J,this._y=this._y*J,this._z=this._z*J,this._w=this._w*J;return this._onChangeCallback(),this}multiply(J){return this.multiplyQuaternions(this,J)}premultiply(J){return this.multiplyQuaternions(J,this)}multiplyQuaternions(J,Q){let{_x:$,_y:W,_z:Z,_w:K}=J,Y=Q._x,X=Q._y,H=Q._z,U=Q._w;return this._x=$*U+K*Y+W*H-Z*X,this._y=W*U+K*X+Z*Y-$*H,this._z=Z*U+K*H+$*X-W*Y,this._w=K*U-$*Y-W*X-Z*H,this._onChangeCallback(),this}slerp(J,Q){let{_x:$,_y:W,_z:Z,_w:K}=J,Y=this.dot(J);if(Y<0)$=-$,W=-W,Z=-Z,K=-K,Y=-Y;let X=1-Q;if(Y<0.9995){let H=Math.acos(Y),U=Math.sin(H);X=Math.sin(X*H)/U,Q=Math.sin(Q*H)/U,this._x=this._x*X+$*Q,this._y=this._y*X+W*Q,this._z=this._z*X+Z*Q,this._w=this._w*X+K*Q,this._onChangeCallback()}else this._x=this._x*X+$*Q,this._y=this._y*X+W*Q,this._z=this._z*X+Z*Q,this._w=this._w*X+K*Q,this.normalize();return this}slerpQuaternions(J,Q,$){return this.copy(J).slerp(Q,$)}random(){let J=2*Math.PI*Math.random(),Q=2*Math.PI*Math.random(),$=Math.random(),W=Math.sqrt(1-$),Z=Math.sqrt($);return this.set(W*Math.sin(J),W*Math.cos(J),Z*Math.sin(Q),Z*Math.cos(Q))}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._w===this._w}fromArray(J,Q=0){return this._x=J[Q],this._y=J[Q+1],this._z=J[Q+2],this._w=J[Q+3],this._onChangeCallback(),this}toArray(J=[],Q=0){return J[Q]=this._x,J[Q+1]=this._y,J[Q+2]=this._z,J[Q+3]=this._w,J}fromBufferAttribute(J,Q){return this._x=J.getX(Q),this._y=J.getY(Q),this._z=J.getZ(Q),this._w=J.getW(Q),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class v{static{v.prototype.isVector3=!0}constructor(J=0,Q=0,$=0){this.x=J,this.y=Q,this.z=$}set(J,Q,$){if($===void 0)$=this.z;return this.x=J,this.y=Q,this.z=$,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;case 2:this.z=Q;break;default:throw Error("THREE.Vector3: index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("THREE.Vector3: index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this.z=J.z+Q.z,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this.z+=J.z*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this.z=J.z-Q.z,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this}multiplyVectors(J,Q){return this.x=J.x*Q.x,this.y=J.y*Q.y,this.z=J.z*Q.z,this}applyEuler(J){return this.applyQuaternion(m$.setFromEuler(J))}applyAxisAngle(J,Q){return this.applyQuaternion(m$.setFromAxisAngle(J,Q))}applyMatrix3(J){let Q=this.x,$=this.y,W=this.z,Z=J.elements;return this.x=Z[0]*Q+Z[3]*$+Z[6]*W,this.y=Z[1]*Q+Z[4]*$+Z[7]*W,this.z=Z[2]*Q+Z[5]*$+Z[8]*W,this}applyNormalMatrix(J){return this.applyMatrix3(J).normalize()}applyMatrix4(J){let Q=this.x,$=this.y,W=this.z,Z=J.elements,K=1/(Z[3]*Q+Z[7]*$+Z[11]*W+Z[15]);return this.x=(Z[0]*Q+Z[4]*$+Z[8]*W+Z[12])*K,this.y=(Z[1]*Q+Z[5]*$+Z[9]*W+Z[13])*K,this.z=(Z[2]*Q+Z[6]*$+Z[10]*W+Z[14])*K,this}applyQuaternion(J){let Q=this.x,$=this.y,W=this.z,Z=J.x,K=J.y,Y=J.z,X=J.w,H=2*(K*W-Y*$),U=2*(Y*Q-Z*W),N=2*(Z*$-K*Q);return this.x=Q+X*H+K*N-Y*U,this.y=$+X*U+Y*H-Z*N,this.z=W+X*N+Z*U-K*H,this}project(J){return this.applyMatrix4(J.matrixWorldInverse).applyMatrix4(J.projectionMatrix)}unproject(J){return this.applyMatrix4(J.projectionMatrixInverse).applyMatrix4(J.matrixWorld)}transformDirection(J){let Q=this.x,$=this.y,W=this.z,Z=J.elements;return this.x=Z[0]*Q+Z[4]*$+Z[8]*W,this.y=Z[1]*Q+Z[5]*$+Z[9]*W,this.z=Z[2]*Q+Z[6]*$+Z[10]*W,this.normalize()}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this}divideScalar(J){return this.multiplyScalar(1/J)}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this}clamp(J,Q){return this.x=x0(this.x,J.x,Q.x),this.y=x0(this.y,J.y,Q.y),this.z=x0(this.z,J.z,Q.z),this}clampScalar(J,Q){return this.x=x0(this.x,J,Q),this.y=x0(this.y,J,Q),this.z=x0(this.z,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(x0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this.z+=(J.z-this.z)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this.z=J.z+(Q.z-J.z)*$,this}cross(J){return this.crossVectors(this,J)}crossVectors(J,Q){let{x:$,y:W,z:Z}=J,K=Q.x,Y=Q.y,X=Q.z;return this.x=W*X-Z*Y,this.y=Z*K-$*X,this.z=$*Y-W*K,this}projectOnVector(J){let Q=J.lengthSq();if(Q===0)return this.set(0,0,0);let $=J.dot(this)/Q;return this.copy(J).multiplyScalar($)}projectOnPlane(J){return F6.copy(this).projectOnVector(J),this.sub(F6)}reflect(J){return this.sub(F6.copy(J).multiplyScalar(2*this.dot(J)))}angleTo(J){let Q=Math.sqrt(this.lengthSq()*J.lengthSq());if(Q===0)return Math.PI/2;let $=this.dot(J)/Q;return Math.acos(x0($,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let Q=this.x-J.x,$=this.y-J.y,W=this.z-J.z;return Q*Q+$*$+W*W}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)+Math.abs(this.z-J.z)}setFromSpherical(J){return this.setFromSphericalCoords(J.radius,J.phi,J.theta)}setFromSphericalCoords(J,Q,$){let W=Math.sin(Q)*J;return this.x=W*Math.sin($),this.y=Math.cos(Q)*J,this.z=W*Math.cos($),this}setFromCylindrical(J){return this.setFromCylindricalCoords(J.radius,J.theta,J.y)}setFromCylindricalCoords(J,Q,$){return this.x=J*Math.sin(Q),this.y=$,this.z=J*Math.cos(Q),this}setFromMatrixPosition(J){let Q=J.elements;return this.x=Q[12],this.y=Q[13],this.z=Q[14],this}setFromMatrixScale(J){let Q=this.setFromMatrixColumn(J,0).length(),$=this.setFromMatrixColumn(J,1).length(),W=this.setFromMatrixColumn(J,2).length();return this.x=Q,this.y=$,this.z=W,this}setFromMatrixColumn(J,Q){return this.fromArray(J.elements,Q*4)}setFromMatrix3Column(J,Q){return this.fromArray(J.elements,Q*3)}setFromEuler(J){return this.x=J._x,this.y=J._y,this.z=J._z,this}setFromColor(J){return this.x=J.r,this.y=J.g,this.z=J.b,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this.z=J[Q+2],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J[Q+2]=this.z,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this.z=J.getZ(Q),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let J=Math.random()*Math.PI*2,Q=Math.random()*2-1,$=Math.sqrt(1-Q*Q);return this.x=$*Math.cos(J),this.y=Q,this.z=$*Math.sin(J),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}var F6=new v,m$=new aJ;class y0{static{y0.prototype.isMatrix3=!0}constructor(J,Q,$,W,Z,K,Y,X,H){if(this.elements=[1,0,0,0,1,0,0,0,1],J!==void 0)this.set(J,Q,$,W,Z,K,Y,X,H)}set(J,Q,$,W,Z,K,Y,X,H){let U=this.elements;return U[0]=J,U[1]=W,U[2]=Y,U[3]=Q,U[4]=Z,U[5]=X,U[6]=$,U[7]=K,U[8]=H,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(J){let Q=this.elements,$=J.elements;return Q[0]=$[0],Q[1]=$[1],Q[2]=$[2],Q[3]=$[3],Q[4]=$[4],Q[5]=$[5],Q[6]=$[6],Q[7]=$[7],Q[8]=$[8],this}extractBasis(J,Q,$){return J.setFromMatrix3Column(this,0),Q.setFromMatrix3Column(this,1),$.setFromMatrix3Column(this,2),this}setFromMatrix4(J){let Q=J.elements;return this.set(Q[0],Q[4],Q[8],Q[1],Q[5],Q[9],Q[2],Q[6],Q[10]),this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,Q){let $=J.elements,W=Q.elements,Z=this.elements,K=$[0],Y=$[3],X=$[6],H=$[1],U=$[4],N=$[7],E=$[2],G=$[5],D=$[8],M=W[0],I=W[3],F=W[6],q=W[1],A=W[4],j=W[7],V=W[2],z=W[5],P=W[8];return Z[0]=K*M+Y*q+X*V,Z[3]=K*I+Y*A+X*z,Z[6]=K*F+Y*j+X*P,Z[1]=H*M+U*q+N*V,Z[4]=H*I+U*A+N*z,Z[7]=H*F+U*j+N*P,Z[2]=E*M+G*q+D*V,Z[5]=E*I+G*A+D*z,Z[8]=E*F+G*j+D*P,this}multiplyScalar(J){let Q=this.elements;return Q[0]*=J,Q[3]*=J,Q[6]*=J,Q[1]*=J,Q[4]*=J,Q[7]*=J,Q[2]*=J,Q[5]*=J,Q[8]*=J,this}determinant(){let J=this.elements,Q=J[0],$=J[1],W=J[2],Z=J[3],K=J[4],Y=J[5],X=J[6],H=J[7],U=J[8];return Q*K*U-Q*Y*H-$*Z*U+$*Y*X+W*Z*H-W*K*X}invert(){let J=this.elements,Q=J[0],$=J[1],W=J[2],Z=J[3],K=J[4],Y=J[5],X=J[6],H=J[7],U=J[8],N=U*K-Y*H,E=Y*X-U*Z,G=H*Z-K*X,D=Q*N+$*E+W*G;if(D===0)return this.set(0,0,0,0,0,0,0,0,0);let M=1/D;return J[0]=N*M,J[1]=(W*H-U*$)*M,J[2]=(Y*$-W*K)*M,J[3]=E*M,J[4]=(U*Q-W*X)*M,J[5]=(W*Z-Y*Q)*M,J[6]=G*M,J[7]=($*X-H*Q)*M,J[8]=(K*Q-$*Z)*M,this}transpose(){let J,Q=this.elements;return J=Q[1],Q[1]=Q[3],Q[3]=J,J=Q[2],Q[2]=Q[6],Q[6]=J,J=Q[5],Q[5]=Q[7],Q[7]=J,this}getNormalMatrix(J){return this.setFromMatrix4(J).invert().transpose()}transposeIntoArray(J){let Q=this.elements;return J[0]=Q[0],J[1]=Q[3],J[2]=Q[6],J[3]=Q[1],J[4]=Q[4],J[5]=Q[7],J[6]=Q[2],J[7]=Q[5],J[8]=Q[8],this}setUvTransform(J,Q,$,W,Z,K,Y){let X=Math.cos(Z),H=Math.sin(Z);return this.set($*X,$*H,-$*(X*K+H*Y)+K+J,-W*H,W*X,-W*(-H*K+X*Y)+Y+Q,0,0,1),this}scale(J,Q){return s9("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(D6.makeScale(J,Q)),this}rotate(J){return s9("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(D6.makeRotation(-J)),this}translate(J,Q){return s9("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(D6.makeTranslation(J,Q)),this}makeTranslation(J,Q){if(J.isVector2)this.set(1,0,J.x,0,1,J.y,0,0,1);else this.set(1,0,J,0,1,Q,0,0,1);return this}makeRotation(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,-$,0,$,Q,0,0,0,1),this}makeScale(J,Q){return this.set(J,0,0,0,Q,0,0,0,1),this}equals(J){let Q=this.elements,$=J.elements;for(let W=0;W<9;W++)if(Q[W]!==$[W])return!1;return!0}fromArray(J,Q=0){for(let $=0;$<9;$++)this.elements[$]=J[$+Q];return this}toArray(J=[],Q=0){let $=this.elements;return J[Q]=$[0],J[Q+1]=$[1],J[Q+2]=$[2],J[Q+3]=$[3],J[Q+4]=$[4],J[Q+5]=$[5],J[Q+6]=$[6],J[Q+7]=$[7],J[Q+8]=$[8],J}clone(){return new this.constructor().fromArray(this.elements)}}var D6=new y0,l$=new y0().set(0.4123908,0.3575843,0.1804808,0.212639,0.7151687,0.0721923,0.0193308,0.1191948,0.9505322),d$=new y0().set(3.2409699,-1.5373832,-0.4986108,-0.9692436,1.8759675,0.0415551,0.0556301,-0.203977,1.0569715);function cK(){let J={enabled:!0,workingColorSpace:"srgb-linear",spaces:{},convert:function(Z,K,Y){if(this.enabled===!1||K===Y||!K||!Y)return Z;if(this.spaces[K].transfer==="srgb")Z.r=B9(Z.r),Z.g=B9(Z.g),Z.b=B9(Z.b);if(this.spaces[K].primaries!==this.spaces[Y].primaries)Z.applyMatrix3(this.spaces[K].toXYZ),Z.applyMatrix3(this.spaces[Y].fromXYZ);if(this.spaces[Y].transfer==="srgb")Z.r=z8(Z.r),Z.g=z8(Z.g),Z.b=z8(Z.b);return Z},workingToColorSpace:function(Z,K){return this.convert(Z,this.workingColorSpace,K)},colorSpaceToWorking:function(Z,K){return this.convert(Z,K,this.workingColorSpace)},getPrimaries:function(Z){return this.spaces[Z].primaries},getTransfer:function(Z){if(Z==="")return"linear";return this.spaces[Z].transfer},getToneMappingMode:function(Z){return this.spaces[Z].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(Z,K=this.workingColorSpace){return Z.fromArray(this.spaces[K].luminanceCoefficients)},define:function(Z){Object.assign(this.spaces,Z)},_getMatrix:function(Z,K,Y){return Z.copy(this.spaces[K].toXYZ).multiply(this.spaces[Y].fromXYZ)},_getDrawingBufferColorSpace:function(Z){return this.spaces[Z].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(Z=this.workingColorSpace){return this.spaces[Z].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(Z,K){return s9("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),J.workingToColorSpace(Z,K)},toWorkingColorSpace:function(Z,K){return s9("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),J.colorSpaceToWorking(Z,K)}},Q=[0.64,0.33,0.3,0.6,0.15,0.06],$=[0.2126,0.7152,0.0722],W=[0.3127,0.329];return J.define({["srgb-linear"]:{primaries:Q,whitePoint:W,transfer:"linear",toXYZ:l$,fromXYZ:d$,luminanceCoefficients:$,workingColorSpaceConfig:{unpackColorSpace:"srgb"},outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}},["srgb"]:{primaries:Q,whitePoint:W,transfer:"srgb",toXYZ:l$,fromXYZ:d$,luminanceCoefficients:$,outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}}}),J}var m0=cK();function B9(J){return J<0.04045?J*0.0773993808:Math.pow(J*0.9478672986+0.0521327014,2.4)}function z8(J){return J<0.0031308?J*12.92:1.055*Math.pow(J,0.41666)-0.055}var U8;class hQ{static getDataURL(J,Q="image/png"){if(/^data:/i.test(J.src))return J.src;if(typeof HTMLCanvasElement>"u")return J.src;let $;if(J instanceof HTMLCanvasElement)$=J;else{if(U8===void 0)U8=o8("canvas");U8.width=J.width,U8.height=J.height;let W=U8.getContext("2d");if(J instanceof ImageData)W.putImageData(J,0,0);else W.drawImage(J,0,0,J.width,J.height);$=U8}return $.toDataURL(Q)}static sRGBToLinear(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap){let Q=o8("canvas");Q.width=J.width,Q.height=J.height;let $=Q.getContext("2d");$.drawImage(J,0,0,J.width,J.height);let W=$.getImageData(0,0,J.width,J.height),Z=W.data;for(let K=0;K<Z.length;K++)Z[K]=B9(Z[K]/255)*255;return $.putImageData(W,0,0),Q}else if(J.data){let Q=J.data.slice(0);for(let $=0;$<Q.length;$++)if(Q instanceof Uint8Array||Q instanceof Uint8ClampedArray)Q[$]=Math.floor(B9(Q[$]/255)*255);else Q[$]=B9(Q[$]);return{data:Q,width:J.width,height:J.height}}else return w0("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),J}}var nK=0;class Q7{constructor(J=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:nK++}),this.uuid=j8(),this.data=J,this.dataReady=!0,this.version=0}getSize(J){let Q=this.data;if(typeof HTMLVideoElement<"u"&&Q instanceof HTMLVideoElement)J.set(Q.videoWidth,Q.videoHeight,0);else if(typeof VideoFrame<"u"&&Q instanceof VideoFrame)J.set(Q.displayWidth,Q.displayHeight,0);else if(Q!==null)J.set(Q.width,Q.height,Q.depth||0);else J.set(0,0,0);return J}set needsUpdate(J){if(J===!0)this.version++}toJSON(J){let Q=J===void 0||typeof J==="string";if(!Q&&J.images[this.uuid]!==void 0)return J.images[this.uuid];let $={uuid:this.uuid,url:""},W=this.data;if(W!==null){let Z;if(Array.isArray(W)){Z=[];for(let K=0,Y=W.length;K<Y;K++)if(W[K].isDataTexture)Z.push(E6(W[K].image));else Z.push(E6(W[K]))}else Z=E6(W);$.url=Z}if(!Q)J.images[this.uuid]=$;return $}}function E6(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap)return hQ.getDataURL(J);else if(J.data)return{data:Array.from(J.data),width:J.width,height:J.height,type:J.data.constructor.name};else return w0("Texture: Unable to serialize Texture."),{}}var sK=0,O6=new v;class wJ extends q9{constructor(J=wJ.DEFAULT_IMAGE,Q=wJ.DEFAULT_MAPPING,$=1001,W=1001,Z=1006,K=1008,Y=1023,X=1009,H=wJ.DEFAULT_ANISOTROPY,U=""){super();this.isTexture=!0,Object.defineProperty(this,"id",{value:sK++}),this.uuid=j8(),this.name="",this.source=new Q7(J),this.mipmaps=[],this.mapping=Q,this.channel=0,this.wrapS=$,this.wrapT=W,this.magFilter=Z,this.minFilter=K,this.anisotropy=H,this.format=Y,this.internalFormat=null,this.type=X,this.offset=new j0(0,0),this.repeat=new j0(1,1),this.center=new j0(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new y0,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=U,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=J&&J.depth&&J.depth>1?!0:!1,this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(O6).x}get height(){return this.source.getSize(O6).y}get depth(){return this.source.getSize(O6).z}get image(){return this.source.data}set image(J){this.source.data=J}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(J){return this.name=J.name,this.source=J.source,this.mipmaps=J.mipmaps.slice(0),this.mapping=J.mapping,this.channel=J.channel,this.wrapS=J.wrapS,this.wrapT=J.wrapT,this.magFilter=J.magFilter,this.minFilter=J.minFilter,this.anisotropy=J.anisotropy,this.format=J.format,this.internalFormat=J.internalFormat,this.type=J.type,this.normalized=J.normalized,this.offset.copy(J.offset),this.repeat.copy(J.repeat),this.center.copy(J.center),this.rotation=J.rotation,this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrix.copy(J.matrix),this.generateMipmaps=J.generateMipmaps,this.premultiplyAlpha=J.premultiplyAlpha,this.flipY=J.flipY,this.unpackAlignment=J.unpackAlignment,this.colorSpace=J.colorSpace,this.renderTarget=J.renderTarget,this.isRenderTargetTexture=J.isRenderTargetTexture,this.isArrayTexture=J.isArrayTexture,this.userData=JSON.parse(JSON.stringify(J.userData)),this.needsUpdate=!0,this}setValues(J){for(let Q in J){let $=J[Q];if($===void 0){w0(`Texture.setValues(): parameter '${Q}' has value of undefined.`);continue}let W=this[Q];if(W===void 0){w0(`Texture.setValues(): property '${Q}' does not exist.`);continue}if(W&&$&&(W.isVector2&&$.isVector2))W.copy($);else if(W&&$&&(W.isVector3&&$.isVector3))W.copy($);else if(W&&$&&(W.isMatrix3&&$.isMatrix3))W.copy($);else this[Q]=$}}toJSON(J){let Q=J===void 0||typeof J==="string";if(!Q&&J.textures[this.uuid]!==void 0)return J.textures[this.uuid];let $={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(J).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(Object.keys(this.userData).length>0)$.userData=this.userData;if(!Q)J.textures[this.uuid]=$;return $}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(J){if(this.mapping!==300)return J;if(J.applyMatrix3(this.matrix),J.x<0||J.x>1)switch(this.wrapS){case 1000:J.x=J.x-Math.floor(J.x);break;case 1001:J.x=J.x<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.x)%2)===1)J.x=Math.ceil(J.x)-J.x;else J.x=J.x-Math.floor(J.x);break}if(J.y<0||J.y>1)switch(this.wrapT){case 1000:J.y=J.y-Math.floor(J.y);break;case 1001:J.y=J.y<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.y)%2)===1)J.y=Math.ceil(J.y)-J.y;else J.y=J.y-Math.floor(J.y);break}if(this.flipY)J.y=1-J.y;return J}set needsUpdate(J){if(J===!0)this.version++,this.source.needsUpdate=!0}set needsPMREMUpdate(J){if(J===!0)this.pmremVersion++}}wJ.DEFAULT_IMAGE=null;wJ.DEFAULT_MAPPING=300;wJ.DEFAULT_ANISOTROPY=1;class GJ{static{GJ.prototype.isVector4=!0}constructor(J=0,Q=0,$=0,W=1){this.x=J,this.y=Q,this.z=$,this.w=W}get width(){return this.z}set width(J){this.z=J}get height(){return this.w}set height(J){this.w=J}set(J,Q,$,W){return this.x=J,this.y=Q,this.z=$,this.w=W,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this.w=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setW(J){return this.w=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;case 2:this.z=Q;break;case 3:this.w=Q;break;default:throw Error("THREE.Vector4: index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("THREE.Vector4: index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this.w=J.w!==void 0?J.w:1,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this.w+=J.w,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this.w+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this.z=J.z+Q.z,this.w=J.w+Q.w,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this.z+=J.z*Q,this.w+=J.w*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this.w-=J.w,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this.w-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this.z=J.z-Q.z,this.w=J.w-Q.w,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this.w*=J.w,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this.w*=J,this}applyMatrix4(J){let Q=this.x,$=this.y,W=this.z,Z=this.w,K=J.elements;return this.x=K[0]*Q+K[4]*$+K[8]*W+K[12]*Z,this.y=K[1]*Q+K[5]*$+K[9]*W+K[13]*Z,this.z=K[2]*Q+K[6]*$+K[10]*W+K[14]*Z,this.w=K[3]*Q+K[7]*$+K[11]*W+K[15]*Z,this}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this.w/=J.w,this}divideScalar(J){return this.multiplyScalar(1/J)}setAxisAngleFromQuaternion(J){this.w=2*Math.acos(J.w);let Q=Math.sqrt(1-J.w*J.w);if(Q<0.0001)this.x=1,this.y=0,this.z=0;else this.x=J.x/Q,this.y=J.y/Q,this.z=J.z/Q;return this}setAxisAngleFromRotationMatrix(J){let Q,$,W,Z,K=0.01,Y=0.1,X=J.elements,H=X[0],U=X[4],N=X[8],E=X[1],G=X[5],D=X[9],M=X[2],I=X[6],F=X[10];if(Math.abs(U-E)<0.01&&Math.abs(N-M)<0.01&&Math.abs(D-I)<0.01){if(Math.abs(U+E)<0.1&&Math.abs(N+M)<0.1&&Math.abs(D+I)<0.1&&Math.abs(H+G+F-3)<0.1)return this.set(1,0,0,0),this;Q=Math.PI;let A=(H+1)/2,j=(G+1)/2,V=(F+1)/2,z=(U+E)/4,P=(N+M)/4,C=(D+I)/4;if(A>j&&A>V)if(A<0.01)$=0,W=0.707106781,Z=0.707106781;else $=Math.sqrt(A),W=z/$,Z=P/$;else if(j>V)if(j<0.01)$=0.707106781,W=0,Z=0.707106781;else W=Math.sqrt(j),$=z/W,Z=C/W;else if(V<0.01)$=0.707106781,W=0.707106781,Z=0;else Z=Math.sqrt(V),$=P/Z,W=C/Z;return this.set($,W,Z,Q),this}let q=Math.sqrt((I-D)*(I-D)+(N-M)*(N-M)+(E-U)*(E-U));if(Math.abs(q)<0.001)q=1;return this.x=(I-D)/q,this.y=(N-M)/q,this.z=(E-U)/q,this.w=Math.acos((H+G+F-1)/2),this}setFromMatrixPosition(J){let Q=J.elements;return this.x=Q[12],this.y=Q[13],this.z=Q[14],this.w=Q[15],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this.w=Math.min(this.w,J.w),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this.w=Math.max(this.w,J.w),this}clamp(J,Q){return this.x=x0(this.x,J.x,Q.x),this.y=x0(this.y,J.y,Q.y),this.z=x0(this.z,J.z,Q.z),this.w=x0(this.w,J.w,Q.w),this}clampScalar(J,Q){return this.x=x0(this.x,J,Q),this.y=x0(this.y,J,Q),this.z=x0(this.z,J,Q),this.w=x0(this.w,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(x0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z+this.w*J.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this.z+=(J.z-this.z)*Q,this.w+=(J.w-this.w)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this.z=J.z+(Q.z-J.z)*$,this.w=J.w+(Q.w-J.w)*$,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z&&J.w===this.w}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this.z=J[Q+2],this.w=J[Q+3],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J[Q+2]=this.z,J[Q+3]=this.w,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this.z=J.getZ(Q),this.w=J.getW(Q),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class bQ extends q9{constructor(J=1,Q=1,$={}){super();$=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},$),this.isRenderTarget=!0,this.width=J,this.height=Q,this.depth=$.depth,this.scissor=new GJ(0,0,J,Q),this.scissorTest=!1,this.viewport=new GJ(0,0,J,Q),this.textures=[];let W={width:J,height:Q,depth:$.depth},Z=new wJ(W),K=$.count;for(let Y=0;Y<K;Y++)this.textures[Y]=Z.clone(),this.textures[Y].isRenderTargetTexture=!0,this.textures[Y].renderTarget=this;this._setTextureOptions($),this.depthBuffer=$.depthBuffer,this.stencilBuffer=$.stencilBuffer,this.resolveColorBuffer=$.resolveColorBuffer,this.resolveDepthBuffer=$.resolveDepthBuffer,this.resolveStencilBuffer=$.resolveStencilBuffer,this.storeMultisampledColorBuffer=$.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=$.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=$.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=$.depthTexture,this.samples=$.samples,this.multiview=$.multiview,this.useArrayDepthTexture=$.useArrayDepthTexture}_setTextureOptions(J={}){let Q={minFilter:1006,generateMipmaps:!1,flipY:!1,internalFormat:null};if(J.mapping!==void 0)Q.mapping=J.mapping;if(J.wrapS!==void 0)Q.wrapS=J.wrapS;if(J.wrapT!==void 0)Q.wrapT=J.wrapT;if(J.wrapR!==void 0)Q.wrapR=J.wrapR;if(J.magFilter!==void 0)Q.magFilter=J.magFilter;if(J.minFilter!==void 0)Q.minFilter=J.minFilter;if(J.format!==void 0)Q.format=J.format;if(J.type!==void 0)Q.type=J.type;if(J.anisotropy!==void 0)Q.anisotropy=J.anisotropy;if(J.colorSpace!==void 0)Q.colorSpace=J.colorSpace;if(J.flipY!==void 0)Q.flipY=J.flipY;if(J.generateMipmaps!==void 0)Q.generateMipmaps=J.generateMipmaps;if(J.internalFormat!==void 0)Q.internalFormat=J.internalFormat;for(let $=0;$<this.textures.length;$++)this.textures[$].setValues(Q)}get texture(){return this.textures[0]}set texture(J){this.textures[0]=J}set depthTexture(J){if(this._depthTexture!==null&&this._depthTexture.renderTarget===this)this._depthTexture.renderTarget=null;if(J!==null&&J.renderTarget===null)J.renderTarget=this;this._depthTexture=J}get depthTexture(){return this._depthTexture}setSize(J,Q,$=1){if(this.width!==J||this.height!==Q||this.depth!==$){this.width=J,this.height=Q,this.depth=$;for(let W=0,Z=this.textures.length;W<Z;W++)if(this.textures[W].image.width=J,this.textures[W].image.height=Q,this.textures[W].image.depth=$,this.textures[W].isData3DTexture!==!0)this.textures[W].isArrayTexture=this.textures[W].image.depth>1;this.dispose()}this.viewport.set(0,0,J,Q),this.scissor.set(0,0,J,Q)}clone(){return new this.constructor().copy(this)}copy(J){this.width=J.width,this.height=J.height,this.depth=J.depth,this.scissor.copy(J.scissor),this.scissorTest=J.scissorTest,this.viewport.copy(J.viewport),this.textures.length=0;for(let Q=0,$=J.textures.length;Q<$;Q++){this.textures[Q]=J.textures[Q].clone(),this.textures[Q].isRenderTargetTexture=!0,this.textures[Q].renderTarget=this;let W=Object.assign({},J.textures[Q].image);this.textures[Q].source=new Q7(W)}if(this.depthBuffer=J.depthBuffer,this.stencilBuffer=J.stencilBuffer,this.resolveColorBuffer=J.resolveColorBuffer,this.resolveDepthBuffer=J.resolveDepthBuffer,this.resolveStencilBuffer=J.resolveStencilBuffer,this.storeMultisampledColorBuffer=J.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=J.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=J.storeMultisampledStencilBuffer,J.depthTexture!==null)if(J.depthTexture.renderTarget===J){let Q=J.depthTexture.clone();Q.renderTarget=null,this.depthTexture=Q}else this.depthTexture=J.depthTexture;return this.samples=J.samples,this.multiview=J.multiview,this.useArrayDepthTexture=J.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class cJ extends bQ{constructor(J=1,Q=1,$={}){super(J,Q,$);this.isWebGLRenderTarget=!0}}class d7 extends wJ{constructor(J=null,Q=1,$=1,W=1){super(null);this.isDataArrayTexture=!0,this.image={data:J,width:Q,height:$,depth:W},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(J){return super.copy(J),this.wrapR=J.wrapR,this}addLayerUpdate(J){this.layerUpdates.add(J)}clearLayerUpdates(){this.layerUpdates.clear()}}class xQ extends wJ{constructor(J=null,Q=1,$=1,W=1){super(null);this.isData3DTexture=!0,this.image={data:J,width:Q,height:$,depth:W},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(J){return super.copy(J),this.wrapR=J.wrapR,this}}class YJ{static{YJ.prototype.isMatrix4=!0}constructor(J,Q,$,W,Z,K,Y,X,H,U,N,E,G,D,M,I){if(this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],J!==void 0)this.set(J,Q,$,W,Z,K,Y,X,H,U,N,E,G,D,M,I)}set(J,Q,$,W,Z,K,Y,X,H,U,N,E,G,D,M,I){let F=this.elements;return F[0]=J,F[4]=Q,F[8]=$,F[12]=W,F[1]=Z,F[5]=K,F[9]=Y,F[13]=X,F[2]=H,F[6]=U,F[10]=N,F[14]=E,F[3]=G,F[7]=D,F[11]=M,F[15]=I,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new YJ().fromArray(this.elements)}copy(J){let Q=this.elements,$=J.elements;return Q[0]=$[0],Q[1]=$[1],Q[2]=$[2],Q[3]=$[3],Q[4]=$[4],Q[5]=$[5],Q[6]=$[6],Q[7]=$[7],Q[8]=$[8],Q[9]=$[9],Q[10]=$[10],Q[11]=$[11],Q[12]=$[12],Q[13]=$[13],Q[14]=$[14],Q[15]=$[15],this}copyPosition(J){let Q=this.elements,$=J.elements;return Q[12]=$[12],Q[13]=$[13],Q[14]=$[14],this}setFromMatrix3(J){let Q=J.elements;return this.set(Q[0],Q[3],Q[6],0,Q[1],Q[4],Q[7],0,Q[2],Q[5],Q[8],0,0,0,0,1),this}extractBasis(J,Q,$){if(this.determinantAffine()===0)return J.set(1,0,0),Q.set(0,1,0),$.set(0,0,1),this;return J.setFromMatrixColumn(this,0),Q.setFromMatrixColumn(this,1),$.setFromMatrixColumn(this,2),this}makeBasis(J,Q,$){return this.set(J.x,Q.x,$.x,0,J.y,Q.y,$.y,0,J.z,Q.z,$.z,0,0,0,0,1),this}extractRotation(J){if(J.determinantAffine()===0)return this.identity();let Q=this.elements,$=J.elements,W=1/G8.setFromMatrixColumn(J,0).length(),Z=1/G8.setFromMatrixColumn(J,1).length(),K=1/G8.setFromMatrixColumn(J,2).length();return Q[0]=$[0]*W,Q[1]=$[1]*W,Q[2]=$[2]*W,Q[3]=0,Q[4]=$[4]*Z,Q[5]=$[5]*Z,Q[6]=$[6]*Z,Q[7]=0,Q[8]=$[8]*K,Q[9]=$[9]*K,Q[10]=$[10]*K,Q[11]=0,Q[12]=0,Q[13]=0,Q[14]=0,Q[15]=1,this}makeRotationFromEuler(J){let Q=this.elements,$=J.x,W=J.y,Z=J.z,K=Math.cos($),Y=Math.sin($),X=Math.cos(W),H=Math.sin(W),U=Math.cos(Z),N=Math.sin(Z);if(J.order==="XYZ"){let E=K*U,G=K*N,D=Y*U,M=Y*N;Q[0]=X*U,Q[4]=-X*N,Q[8]=H,Q[1]=G+D*H,Q[5]=E-M*H,Q[9]=-Y*X,Q[2]=M-E*H,Q[6]=D+G*H,Q[10]=K*X}else if(J.order==="YXZ"){let E=X*U,G=X*N,D=H*U,M=H*N;Q[0]=E+M*Y,Q[4]=D*Y-G,Q[8]=K*H,Q[1]=K*N,Q[5]=K*U,Q[9]=-Y,Q[2]=G*Y-D,Q[6]=M+E*Y,Q[10]=K*X}else if(J.order==="ZXY"){let E=X*U,G=X*N,D=H*U,M=H*N;Q[0]=E-M*Y,Q[4]=-K*N,Q[8]=D+G*Y,Q[1]=G+D*Y,Q[5]=K*U,Q[9]=M-E*Y,Q[2]=-K*H,Q[6]=Y,Q[10]=K*X}else if(J.order==="ZYX"){let E=K*U,G=K*N,D=Y*U,M=Y*N;Q[0]=X*U,Q[4]=D*H-G,Q[8]=E*H+M,Q[1]=X*N,Q[5]=M*H+E,Q[9]=G*H-D,Q[2]=-H,Q[6]=Y*X,Q[10]=K*X}else if(J.order==="YZX"){let E=K*X,G=K*H,D=Y*X,M=Y*H;Q[0]=X*U,Q[4]=M-E*N,Q[8]=D*N+G,Q[1]=N,Q[5]=K*U,Q[9]=-Y*U,Q[2]=-H*U,Q[6]=G*N+D,Q[10]=E-M*N}else if(J.order==="XZY"){let E=K*X,G=K*H,D=Y*X,M=Y*H;Q[0]=X*U,Q[4]=-N,Q[8]=H*U,Q[1]=E*N+M,Q[5]=K*U,Q[9]=G*N-D,Q[2]=D*N-G,Q[6]=Y*U,Q[10]=M*N+E}return Q[3]=0,Q[7]=0,Q[11]=0,Q[12]=0,Q[13]=0,Q[14]=0,Q[15]=1,this}makeRotationFromQuaternion(J){return this.compose(iK,J,oK)}lookAt(J,Q,$){let W=this.elements;if(mJ.subVectors(J,Q),mJ.lengthSq()===0)mJ.z=1;if(mJ.normalize(),w9.crossVectors($,mJ),w9.lengthSq()===0){if(Math.abs($.z)===1)mJ.x+=0.0001;else mJ.z+=0.0001;mJ.normalize(),w9.crossVectors($,mJ)}return w9.normalize(),q7.crossVectors(mJ,w9),W[0]=w9.x,W[4]=q7.x,W[8]=mJ.x,W[1]=w9.y,W[5]=q7.y,W[9]=mJ.y,W[2]=w9.z,W[6]=q7.z,W[10]=mJ.z,this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,Q){let $=J.elements,W=Q.elements,Z=this.elements,K=$[0],Y=$[4],X=$[8],H=$[12],U=$[1],N=$[5],E=$[9],G=$[13],D=$[2],M=$[6],I=$[10],F=$[14],q=$[3],A=$[7],j=$[11],V=$[15],z=W[0],P=W[4],C=W[8],k=W[12],B=W[1],g=W[5],f=W[9],h=W[13],a=W[2],_=W[6],d=W[10],o=W[14],p=W[3],Q0=W[7],c=W[11],r=W[15];return Z[0]=K*z+Y*B+X*a+H*p,Z[4]=K*P+Y*g+X*_+H*Q0,Z[8]=K*C+Y*f+X*d+H*c,Z[12]=K*k+Y*h+X*o+H*r,Z[1]=U*z+N*B+E*a+G*p,Z[5]=U*P+N*g+E*_+G*Q0,Z[9]=U*C+N*f+E*d+G*c,Z[13]=U*k+N*h+E*o+G*r,Z[2]=D*z+M*B+I*a+F*p,Z[6]=D*P+M*g+I*_+F*Q0,Z[10]=D*C+M*f+I*d+F*c,Z[14]=D*k+M*h+I*o+F*r,Z[3]=q*z+A*B+j*a+V*p,Z[7]=q*P+A*g+j*_+V*Q0,Z[11]=q*C+A*f+j*d+V*c,Z[15]=q*k+A*h+j*o+V*r,this}multiplyScalar(J){let Q=this.elements;return Q[0]*=J,Q[4]*=J,Q[8]*=J,Q[12]*=J,Q[1]*=J,Q[5]*=J,Q[9]*=J,Q[13]*=J,Q[2]*=J,Q[6]*=J,Q[10]*=J,Q[14]*=J,Q[3]*=J,Q[7]*=J,Q[11]*=J,Q[15]*=J,this}determinant(){let J=this.elements,Q=J[0],$=J[4],W=J[8],Z=J[12],K=J[1],Y=J[5],X=J[9],H=J[13],U=J[2],N=J[6],E=J[10],G=J[14],D=J[3],M=J[7],I=J[11],F=J[15],q=X*G-H*E,A=Y*G-H*N,j=Y*E-X*N,V=K*G-H*U,z=K*E-X*U,P=K*N-Y*U;return Q*(M*q-I*A+F*j)-$*(D*q-I*V+F*z)+W*(D*A-M*V+F*P)-Z*(D*j-M*z+I*P)}determinantAffine(){let J=this.elements,Q=J[0],$=J[4],W=J[8],Z=J[1],K=J[5],Y=J[9],X=J[2],H=J[6],U=J[10];return Q*(K*U-Y*H)-$*(Z*U-Y*X)+W*(Z*H-K*X)}transpose(){let J=this.elements,Q;return Q=J[1],J[1]=J[4],J[4]=Q,Q=J[2],J[2]=J[8],J[8]=Q,Q=J[6],J[6]=J[9],J[9]=Q,Q=J[3],J[3]=J[12],J[12]=Q,Q=J[7],J[7]=J[13],J[13]=Q,Q=J[11],J[11]=J[14],J[14]=Q,this}setPosition(J,Q,$){let W=this.elements;if(J.isVector3)W[12]=J.x,W[13]=J.y,W[14]=J.z;else W[12]=J,W[13]=Q,W[14]=$;return this}invert(){let J=this.elements,Q=J[0],$=J[1],W=J[2],Z=J[3],K=J[4],Y=J[5],X=J[6],H=J[7],U=J[8],N=J[9],E=J[10],G=J[11],D=J[12],M=J[13],I=J[14],F=J[15],q=Q*Y-$*K,A=Q*X-W*K,j=Q*H-Z*K,V=$*X-W*Y,z=$*H-Z*Y,P=W*H-Z*X,C=U*M-N*D,k=U*I-E*D,B=U*F-G*D,g=N*I-E*M,f=N*F-G*M,h=E*F-G*I,a=q*h-A*f+j*g+V*B-z*k+P*C;if(a===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let _=1/a;return J[0]=(Y*h-X*f+H*g)*_,J[1]=(W*f-$*h-Z*g)*_,J[2]=(M*P-I*z+F*V)*_,J[3]=(E*z-N*P-G*V)*_,J[4]=(X*B-K*h-H*k)*_,J[5]=(Q*h-W*B+Z*k)*_,J[6]=(I*j-D*P-F*A)*_,J[7]=(U*P-E*j+G*A)*_,J[8]=(K*f-Y*B+H*C)*_,J[9]=($*B-Q*f-Z*C)*_,J[10]=(D*z-M*j+F*q)*_,J[11]=(N*j-U*z-G*q)*_,J[12]=(Y*k-K*g-X*C)*_,J[13]=(Q*g-$*k+W*C)*_,J[14]=(M*A-D*V-I*q)*_,J[15]=(U*V-N*A+E*q)*_,this}scale(J){let Q=this.elements,$=J.x,W=J.y,Z=J.z;return Q[0]*=$,Q[4]*=W,Q[8]*=Z,Q[1]*=$,Q[5]*=W,Q[9]*=Z,Q[2]*=$,Q[6]*=W,Q[10]*=Z,Q[3]*=$,Q[7]*=W,Q[11]*=Z,this}getMaxScaleOnAxis(){let J=this.elements,Q=J[0]*J[0]+J[1]*J[1]+J[2]*J[2],$=J[4]*J[4]+J[5]*J[5]+J[6]*J[6],W=J[8]*J[8]+J[9]*J[9]+J[10]*J[10];return Math.sqrt(Math.max(Q,$,W))}makeTranslation(J,Q,$){if(J.isVector3)this.set(1,0,0,J.x,0,1,0,J.y,0,0,1,J.z,0,0,0,1);else this.set(1,0,0,J,0,1,0,Q,0,0,1,$,0,0,0,1);return this}makeRotationX(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(1,0,0,0,0,Q,-$,0,0,$,Q,0,0,0,0,1),this}makeRotationY(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,0,$,0,0,1,0,0,-$,0,Q,0,0,0,0,1),this}makeRotationZ(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,-$,0,0,$,Q,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(J,Q){let $=Math.cos(Q),W=Math.sin(Q),Z=1-$,K=J.x,Y=J.y,X=J.z,H=Z*K,U=Z*Y;return this.set(H*K+$,H*Y-W*X,H*X+W*Y,0,H*Y+W*X,U*Y+$,U*X-W*K,0,H*X-W*Y,U*X+W*K,Z*X*X+$,0,0,0,0,1),this}makeScale(J,Q,$){return this.set(J,0,0,0,0,Q,0,0,0,0,$,0,0,0,0,1),this}makeShear(J,Q,$,W,Z,K){return this.set(1,$,Z,0,J,1,K,0,Q,W,1,0,0,0,0,1),this}compose(J,Q,$){let W=this.elements,Z=Q._x,K=Q._y,Y=Q._z,X=Q._w,H=Z+Z,U=K+K,N=Y+Y,E=Z*H,G=Z*U,D=Z*N,M=K*U,I=K*N,F=Y*N,q=X*H,A=X*U,j=X*N,V=$.x,z=$.y,P=$.z;return W[0]=(1-(M+F))*V,W[1]=(G+j)*V,W[2]=(D-A)*V,W[3]=0,W[4]=(G-j)*z,W[5]=(1-(E+F))*z,W[6]=(I+q)*z,W[7]=0,W[8]=(D+A)*P,W[9]=(I-q)*P,W[10]=(1-(E+M))*P,W[11]=0,W[12]=J.x,W[13]=J.y,W[14]=J.z,W[15]=1,this}decompose(J,Q,$){let W=this.elements;J.x=W[12],J.y=W[13],J.z=W[14];let Z=this.determinantAffine();if(Z===0)return $.set(1,1,1),Q.identity(),this;let K=G8.set(W[0],W[1],W[2]).length(),Y=G8.set(W[4],W[5],W[6]).length(),X=G8.set(W[8],W[9],W[10]).length();if(Z<0)K=-K;eJ.copy(this);let H=1/K,U=1/Y,N=1/X;return eJ.elements[0]*=H,eJ.elements[1]*=H,eJ.elements[2]*=H,eJ.elements[4]*=U,eJ.elements[5]*=U,eJ.elements[6]*=U,eJ.elements[8]*=N,eJ.elements[9]*=N,eJ.elements[10]*=N,Q.setFromRotationMatrix(eJ),$.x=K,$.y=Y,$.z=X,this}makePerspective(J,Q,$,W,Z,K,Y=2000,X=!1){let H=this.elements,U=2*Z/(Q-J),N=2*Z/($-W),E=(Q+J)/(Q-J),G=($+W)/($-W),D,M;if(X)D=Z/(K-Z),M=K*Z/(K-Z);else if(Y===2000)D=-(K+Z)/(K-Z),M=-2*K*Z/(K-Z);else if(Y===2001)D=-K/(K-Z),M=-K*Z/(K-Z);else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+Y);return H[0]=U,H[4]=0,H[8]=E,H[12]=0,H[1]=0,H[5]=N,H[9]=G,H[13]=0,H[2]=0,H[6]=0,H[10]=D,H[14]=M,H[3]=0,H[7]=0,H[11]=-1,H[15]=0,this}makeOrthographic(J,Q,$,W,Z,K,Y=2000,X=!1){let H=this.elements,U=2/(Q-J),N=2/($-W),E=-(Q+J)/(Q-J),G=-($+W)/($-W),D,M;if(X)D=1/(K-Z),M=K/(K-Z);else if(Y===2000)D=-2/(K-Z),M=-(K+Z)/(K-Z);else if(Y===2001)D=-1/(K-Z),M=-Z/(K-Z);else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+Y);return H[0]=U,H[4]=0,H[8]=0,H[12]=E,H[1]=0,H[5]=N,H[9]=0,H[13]=G,H[2]=0,H[6]=0,H[10]=D,H[14]=M,H[3]=0,H[7]=0,H[11]=0,H[15]=1,this}equals(J){let Q=this.elements,$=J.elements;for(let W=0;W<16;W++)if(Q[W]!==$[W])return!1;return!0}fromArray(J,Q=0){for(let $=0;$<16;$++)this.elements[$]=J[$+Q];return this}toArray(J=[],Q=0){let $=this.elements;return J[Q]=$[0],J[Q+1]=$[1],J[Q+2]=$[2],J[Q+3]=$[3],J[Q+4]=$[4],J[Q+5]=$[5],J[Q+6]=$[6],J[Q+7]=$[7],J[Q+8]=$[8],J[Q+9]=$[9],J[Q+10]=$[10],J[Q+11]=$[11],J[Q+12]=$[12],J[Q+13]=$[13],J[Q+14]=$[14],J[Q+15]=$[15],J}}var G8=new v,eJ=new YJ,iK=new v(0,0,0),oK=new v(1,1,1),w9=new v,q7=new v,mJ=new v,u$=new YJ,c$=new aJ;class y9{constructor(J=0,Q=0,$=0,W=y9.DEFAULT_ORDER){this.isEuler=!0,this._x=J,this._y=Q,this._z=$,this._order=W}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get order(){return this._order}set order(J){this._order=J,this._onChangeCallback()}set(J,Q,$,W=this._order){return this._x=J,this._y=Q,this._z=$,this._order=W,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(J){return this._x=J._x,this._y=J._y,this._z=J._z,this._order=J._order,this._onChangeCallback(),this}setFromRotationMatrix(J,Q=this._order,$=!0){let W=J.elements,Z=W[0],K=W[4],Y=W[8],X=W[1],H=W[5],U=W[9],N=W[2],E=W[6],G=W[10];switch(Q){case"XYZ":if(this._y=Math.asin(x0(Y,-1,1)),Math.abs(Y)<0.9999999)this._x=Math.atan2(-U,G),this._z=Math.atan2(-K,Z);else this._x=Math.atan2(E,H),this._z=0;break;case"YXZ":if(this._x=Math.asin(-x0(U,-1,1)),Math.abs(U)<0.9999999)this._y=Math.atan2(Y,G),this._z=Math.atan2(X,H);else this._y=Math.atan2(-N,Z),this._z=0;break;case"ZXY":if(this._x=Math.asin(x0(E,-1,1)),Math.abs(E)<0.9999999)this._y=Math.atan2(-N,G),this._z=Math.atan2(-K,H);else this._y=0,this._z=Math.atan2(X,Z);break;case"ZYX":if(this._y=Math.asin(-x0(N,-1,1)),Math.abs(N)<0.9999999)this._x=Math.atan2(E,G),this._z=Math.atan2(X,Z);else this._x=0,this._z=Math.atan2(-K,H);break;case"YZX":if(this._z=Math.asin(x0(X,-1,1)),Math.abs(X)<0.9999999)this._x=Math.atan2(-U,H),this._y=Math.atan2(-N,Z);else this._x=0,this._y=Math.atan2(Y,G);break;case"XZY":if(this._z=Math.asin(-x0(K,-1,1)),Math.abs(K)<0.9999999)this._x=Math.atan2(E,H),this._y=Math.atan2(Y,Z);else this._x=Math.atan2(-U,G),this._y=0;break;default:w0("Euler: .setFromRotationMatrix() encountered an unknown order: "+Q)}if(this._order=Q,$===!0)this._onChangeCallback();return this}setFromQuaternion(J,Q,$){return u$.makeRotationFromQuaternion(J),this.setFromRotationMatrix(u$,Q,$)}setFromVector3(J,Q=this._order){return this.set(J.x,J.y,J.z,Q)}reorder(J){return c$.setFromEuler(this),this.setFromQuaternion(c$,J)}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._order===this._order}fromArray(J){if(this._x=J[0],this._y=J[1],this._z=J[2],J[3]!==void 0)this._order=J[3];return this._onChangeCallback(),this}toArray(J=[],Q=0){return J[Q]=this._x,J[Q+1]=this._y,J[Q+2]=this._z,J[Q+3]=this._order,J}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}y9.DEFAULT_ORDER="XYZ";class $7{constructor(){this.mask=1}set(J){this.mask=(1<<J|0)>>>0}enable(J){this.mask|=1<<J|0}enableAll(){this.mask=-1}toggle(J){this.mask^=1<<J|0}disable(J){this.mask&=~(1<<J|0)}disableAll(){this.mask=0}test(J){return(this.mask&J.mask)!==0}isEnabled(J){return(this.mask&(1<<J|0))!==0}}var aK=0,n$=new v,N8=new aJ,R9=new YJ,F7=new v,d8=new v,rK=new v,tK=new aJ,s$=new v(1,0,0),i$=new v(0,1,0),o$=new v(0,0,1),a$={type:"added"},eK={type:"removed"},q8={type:"childadded",child:null},R6={type:"childremoved",child:null};class _J extends q9{constructor(){super();this.isObject3D=!0,Object.defineProperty(this,"id",{value:aK++}),this.uuid=j8(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=_J.DEFAULT_UP.clone();let J=new v,Q=new y9,$=new aJ,W=new v(1,1,1);function Z(){$.setFromEuler(Q,!1)}function K(){Q.setFromQuaternion($,void 0,!1)}Q._onChange(Z),$._onChange(K),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:J},rotation:{configurable:!0,enumerable:!0,value:Q},quaternion:{configurable:!0,enumerable:!0,value:$},scale:{configurable:!0,enumerable:!0,value:W},modelViewMatrix:{value:new YJ},normalMatrix:{value:new y0}}),this.matrix=new YJ,this.matrixWorld=new YJ,this.matrixAutoUpdate=_J.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=_J.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new $7,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(J){if(this.matrixAutoUpdate)this.updateMatrix();this.matrix.premultiply(J),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(J){return this.quaternion.premultiply(J),this}setRotationFromAxisAngle(J,Q){this.quaternion.setFromAxisAngle(J,Q)}setRotationFromEuler(J){this.quaternion.setFromEuler(J,!0)}setRotationFromMatrix(J){this.quaternion.setFromRotationMatrix(J)}setRotationFromQuaternion(J){this.quaternion.copy(J)}rotateOnAxis(J,Q){return N8.setFromAxisAngle(J,Q),this.quaternion.multiply(N8),this}rotateOnWorldAxis(J,Q){return N8.setFromAxisAngle(J,Q),this.quaternion.premultiply(N8),this}rotateX(J){return this.rotateOnAxis(s$,J)}rotateY(J){return this.rotateOnAxis(i$,J)}rotateZ(J){return this.rotateOnAxis(o$,J)}translateOnAxis(J,Q){return n$.copy(J).applyQuaternion(this.quaternion),this.position.add(n$.multiplyScalar(Q)),this}translateX(J){return this.translateOnAxis(s$,J)}translateY(J){return this.translateOnAxis(i$,J)}translateZ(J){return this.translateOnAxis(o$,J)}localToWorld(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(this.matrixWorld)}worldToLocal(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(R9.copy(this.matrixWorld).invert())}lookAt(J,Q,$){if(J.isVector3)F7.copy(J);else F7.set(J,Q,$);let W=this.parent;if(this.updateWorldMatrix(!0,!1),d8.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight)R9.lookAt(d8,F7,this.up);else R9.lookAt(F7,d8,this.up);if(this.quaternion.setFromRotationMatrix(R9),W)R9.extractRotation(W.matrixWorld),N8.setFromRotationMatrix(R9),this.quaternion.premultiply(N8.invert())}add(J){if(arguments.length>1){for(let Q=0;Q<arguments.length;Q++)this.add(arguments[Q]);return this}if(J===this)return S0("Object3D.add: object can't be added as a child of itself.",J),this;if(J&&J.isObject3D)J.removeFromParent(),J.parent=this,this.children.push(J),J.dispatchEvent(a$),q8.child=J,this.dispatchEvent(q8),q8.child=null;else S0("Object3D.add: object not an instance of THREE.Object3D.",J);return this}remove(J){if(arguments.length>1){for(let $=0;$<arguments.length;$++)this.remove(arguments[$]);return this}let Q=this.children.indexOf(J);if(Q!==-1)J.parent=null,this.children.splice(Q,1),J.dispatchEvent(eK),R6.child=J,this.dispatchEvent(R6),R6.child=null;return this}removeFromParent(){let J=this.parent;if(J!==null)J.remove(this);return this}clear(){return this.remove(...this.children)}attach(J){if(this.updateWorldMatrix(!0,!1),R9.copy(this.matrixWorld).invert(),J.parent!==null)J.parent.updateWorldMatrix(!0,!1),R9.multiply(J.parent.matrixWorld);return J.applyMatrix4(R9),J.removeFromParent(),J.parent=this,this.children.push(J),J.updateWorldMatrix(!1,!0),J.dispatchEvent(a$),q8.child=J,this.dispatchEvent(q8),q8.child=null,this}getObjectById(J){return this.getObjectByProperty("id",J)}getObjectByName(J){return this.getObjectByProperty("name",J)}getObjectByProperty(J,Q){if(this[J]===Q)return this;for(let $=0,W=this.children.length;$<W;$++){let K=this.children[$].getObjectByProperty(J,Q);if(K!==void 0)return K}return}getObjectsByProperty(J,Q,$=[]){if(this[J]===Q)$.push(this);let W=this.children;for(let Z=0,K=W.length;Z<K;Z++)W[Z].getObjectsByProperty(J,Q,$);return $}getWorldPosition(J){return this.updateWorldMatrix(!0,!1),J.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(d8,J,rK),J}getWorldScale(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(d8,tK,J),J}getWorldDirection(J){this.updateWorldMatrix(!0,!1);let Q=this.matrixWorld.elements;return J.set(Q[8],Q[9],Q[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(J){J(this);let Q=this.children;for(let $=0,W=Q.length;$<W;$++)Q[$].traverse(J)}traverseVisible(J){if(this.visible===!1)return;J(this);let Q=this.children;for(let $=0,W=Q.length;$<W;$++)Q[$].traverseVisible(J)}traverseAncestors(J){let Q=this.parent;if(Q!==null)J(Q),Q.traverseAncestors(J)}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let J=this.pivot;if(J!==null){let{x:Q,y:$,z:W}=J,Z=this.matrix.elements;Z[12]+=Q-Z[0]*Q-Z[4]*$-Z[8]*W,Z[13]+=$-Z[1]*Q-Z[5]*$-Z[9]*W,Z[14]+=W-Z[2]*Q-Z[6]*$-Z[10]*W}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(J){if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||J){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,J=!0}let Q=this.children;for(let $=0,W=Q.length;$<W;$++)Q[$].updateMatrixWorld(J)}updateWorldMatrix(J,Q,$=!1){let W=this.parent;if(J===!0&&W!==null)W.updateWorldMatrix(!0,!1);if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||$){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,$=!0}if(Q===!0){let Z=this.children;for(let K=0,Y=Z.length;K<Y;K++)Z[K].updateWorldMatrix(!1,!0,$)}}toJSON(J){let Q=J===void 0||typeof J==="string",$={};if(Q)J={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},$.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"};let W={};if(W.uuid=this.uuid,W.type=this.type,W.name=this.name,W.castShadow=this.castShadow,W.receiveShadow=this.receiveShadow,W.visible=this.visible,W.frustumCulled=this.frustumCulled,W.renderOrder=this.renderOrder,W.static=this.static,W.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0)W.userData=this.userData;if(W.layers=this.layers.mask,W.matrix=this.matrix.toArray(),W.up=this.up.toArray(),this.pivot!==null)W.pivot=this.pivot.toArray();if(this.morphTargetDictionary!==void 0)W.morphTargetDictionary=Object.assign({},this.morphTargetDictionary);if(this.morphTargetInfluences!==void 0)W.morphTargetInfluences=this.morphTargetInfluences.slice();if(this.isInstancedMesh){if(W.type="InstancedMesh",W.count=this.count,W.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null)W.instanceColor=this.instanceColor.toJSON()}if(this.isBatchedMesh){if(W.type="BatchedMesh",W.perObjectFrustumCulled=this.perObjectFrustumCulled,W.sortObjects=this.sortObjects,W.drawRanges=this._drawRanges,W.reservedRanges=this._reservedRanges,W.geometryInfo=this._geometryInfo.map((Y)=>({...Y,boundingBox:Y.boundingBox?Y.boundingBox.toJSON():void 0,boundingSphere:Y.boundingSphere?Y.boundingSphere.toJSON():void 0})),W.instanceInfo=this._instanceInfo.map((Y)=>({...Y})),W.availableInstanceIds=this._availableInstanceIds.slice(),W.availableGeometryIds=this._availableGeometryIds.slice(),W.nextIndexStart=this._nextIndexStart,W.nextVertexStart=this._nextVertexStart,W.geometryCount=this._geometryCount,W.maxInstanceCount=this._maxInstanceCount,W.maxVertexCount=this._maxVertexCount,W.maxIndexCount=this._maxIndexCount,W.geometryInitialized=this._geometryInitialized,W.matricesTexture=this._matricesTexture.toJSON(J),W.indirectTexture=this._indirectTexture.toJSON(J),this._colorsTexture!==null)W.colorsTexture=this._colorsTexture.toJSON(J);if(this.boundingSphere!==null)W.boundingSphere=this.boundingSphere.toJSON();if(this.boundingBox!==null)W.boundingBox=this.boundingBox.toJSON()}function Z(Y,X){if(Y[X.uuid]===void 0)Y[X.uuid]=X.toJSON(J);return X.uuid}if(this.isScene){if(this.background){if(this.background.isColor)W.background=this.background.toJSON();else if(this.background.isTexture)W.background=this.background.toJSON(J).uuid}if(this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0)W.environment=this.environment.toJSON(J).uuid}else if(this.isMesh||this.isLine||this.isPoints){W.geometry=Z(J.geometries,this.geometry);let Y=this.geometry.parameters;if(Y!==void 0&&Y.shapes!==void 0){let X=Y.shapes;if(Array.isArray(X))for(let H=0,U=X.length;H<U;H++){let N=X[H];Z(J.shapes,N)}else Z(J.shapes,X)}}if(this.isSkinnedMesh){if(W.bindMode=this.bindMode,W.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0)Z(J.skeletons,this.skeleton),W.skeleton=this.skeleton.uuid}if(this.material!==void 0)if(Array.isArray(this.material)){let Y=[];for(let X=0,H=this.material.length;X<H;X++)Y.push(Z(J.materials,this.material[X]));W.material=Y}else W.material=Z(J.materials,this.material);if(this.children.length>0){W.children=[];for(let Y=0;Y<this.children.length;Y++)W.children.push(this.children[Y].toJSON(J).object)}if(this.animations.length>0){W.animations=[];for(let Y=0;Y<this.animations.length;Y++){let X=this.animations[Y];W.animations.push(Z(J.animations,X))}}if(Q){let Y=K(J.geometries),X=K(J.materials),H=K(J.textures),U=K(J.images),N=K(J.shapes),E=K(J.skeletons),G=K(J.animations),D=K(J.nodes);if(Y.length>0)$.geometries=Y;if(X.length>0)$.materials=X;if(H.length>0)$.textures=H;if(U.length>0)$.images=U;if(N.length>0)$.shapes=N;if(E.length>0)$.skeletons=E;if(G.length>0)$.animations=G;if(D.length>0)$.nodes=D}return $.object=W,$;function K(Y){let X=[];for(let H in Y){let U=Y[H];delete U.metadata,X.push(U)}return X}}clone(J){return new this.constructor().copy(this,J)}copy(J,Q=!0){if(this.name=J.name,this.up.copy(J.up),this.position.copy(J.position),this.rotation.order=J.rotation.order,this.quaternion.copy(J.quaternion),this.scale.copy(J.scale),this.pivot=J.pivot!==null?J.pivot.clone():null,this.matrix.copy(J.matrix),this.matrixWorld.copy(J.matrixWorld),this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrixWorldAutoUpdate=J.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=J.matrixWorldNeedsUpdate,this.layers.mask=J.layers.mask,this.visible=J.visible,this.castShadow=J.castShadow,this.receiveShadow=J.receiveShadow,this.frustumCulled=J.frustumCulled,this.renderOrder=J.renderOrder,this.static=J.static,this.animations=J.animations.slice(),this.userData=JSON.parse(JSON.stringify(J.userData)),Q===!0)for(let $=0;$<J.children.length;$++){let W=J.children[$];this.add(W.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}_J.DEFAULT_UP=new v(0,1,0);_J.DEFAULT_MATRIX_AUTO_UPDATE=!0;_J.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class I8 extends _J{constructor(){super();this.isGroup=!0,this.type="Group"}}var JY={type:"move"};class W7{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){if(this._hand===null)this._hand=new I8,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1};return this._hand}getTargetRaySpace(){if(this._targetRay===null)this._targetRay=new I8,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new v,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new v;return this._targetRay}getGripSpace(){if(this._grip===null)this._grip=new I8,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new v,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new v,this._grip.eventsEnabled=!1;return this._grip}dispatchEvent(J){if(this._targetRay!==null)this._targetRay.dispatchEvent(J);if(this._grip!==null)this._grip.dispatchEvent(J);if(this._hand!==null)this._hand.dispatchEvent(J);return this}connect(J){if(J&&J.hand){let Q=this._hand;if(Q)for(let $ of J.hand.values())this._getHandJoint(Q,$)}return this.dispatchEvent({type:"connected",data:J}),this}disconnect(J){if(this.dispatchEvent({type:"disconnected",data:J}),this._targetRay!==null)this._targetRay.visible=!1;if(this._grip!==null)this._grip.visible=!1;if(this._hand!==null)this._hand.visible=!1;return this}update(J,Q,$){let W=null,Z=null,K=null,Y=this._targetRay,X=this._grip,H=this._hand;if(J&&Q.session.visibilityState!=="visible-blurred"){if(H&&J.hand){K=!0;for(let M of J.hand.values()){let I=Q.getJointPose(M,$),F=this._getHandJoint(H,M);if(I!==null)F.matrix.fromArray(I.transform.matrix),F.matrix.decompose(F.position,F.rotation,F.scale),F.matrixWorldNeedsUpdate=!0,F.jointRadius=I.radius;F.visible=I!==null}let U=H.joints["index-finger-tip"],N=H.joints["thumb-tip"],E=U.position.distanceTo(N.position),G=0.02,D=0.005;if(H.inputState.pinching&&E>G+D)H.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:J.handedness,target:this});else if(!H.inputState.pinching&&E<=G-D)H.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:J.handedness,target:this})}else if(X!==null&&J.gripSpace){if(Z=Q.getPose(J.gripSpace,$),Z!==null){if(X.matrix.fromArray(Z.transform.matrix),X.matrix.decompose(X.position,X.rotation,X.scale),X.matrixWorldNeedsUpdate=!0,Z.linearVelocity)X.hasLinearVelocity=!0,X.linearVelocity.copy(Z.linearVelocity);else X.hasLinearVelocity=!1;if(Z.angularVelocity)X.hasAngularVelocity=!0,X.angularVelocity.copy(Z.angularVelocity);else X.hasAngularVelocity=!1;if(X.eventsEnabled)X.dispatchEvent({type:"gripUpdated",data:J,target:this})}}if(Y!==null){if(W=Q.getPose(J.targetRaySpace,$),W===null&&Z!==null)W=Z;if(W!==null){if(Y.matrix.fromArray(W.transform.matrix),Y.matrix.decompose(Y.position,Y.rotation,Y.scale),Y.matrixWorldNeedsUpdate=!0,W.linearVelocity)Y.hasLinearVelocity=!0,Y.linearVelocity.copy(W.linearVelocity);else Y.hasLinearVelocity=!1;if(W.angularVelocity)Y.hasAngularVelocity=!0,Y.angularVelocity.copy(W.angularVelocity);else Y.hasAngularVelocity=!1;this.dispatchEvent(JY)}}}if(Y!==null)Y.visible=W!==null;if(X!==null)X.visible=Z!==null;if(H!==null)H.visible=K!==null;return this}_getHandJoint(J,Q){if(J.joints[Q.jointName]===void 0){let $=new I8;$.matrixAutoUpdate=!1,$.visible=!1,J.joints[Q.jointName]=$,J.add($)}return J.joints[Q.jointName]}}var UZ={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},_9={h:0,s:0,l:0},D7={h:0,s:0,l:0};function k6(J,Q,$){if($<0)$+=1;if($>1)$-=1;if($<0.16666666666666666)return J+(Q-J)*6*$;if($<0.5)return Q;if($<0.6666666666666666)return J+(Q-J)*6*(0.6666666666666666-$);return J}class C0{constructor(J,Q,$){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(J,Q,$)}set(J,Q,$){if(Q===void 0&&$===void 0){let W=J;if(W&&W.isColor)this.copy(W);else if(typeof W==="number")this.setHex(W);else if(typeof W==="string")this.setStyle(W)}else this.setRGB(J,Q,$);return this}setScalar(J){return this.r=J,this.g=J,this.b=J,this}setHex(J,Q="srgb"){return J=Math.floor(J),this.r=(J>>16&255)/255,this.g=(J>>8&255)/255,this.b=(J&255)/255,m0.colorSpaceToWorking(this,Q),this}setRGB(J,Q,$,W=m0.workingColorSpace){return this.r=J,this.g=Q,this.b=$,m0.colorSpaceToWorking(this,W),this}setHSL(J,Q,$,W=m0.workingColorSpace){if(J=fQ(J,1),Q=x0(Q,0,1),$=x0($,0,1),Q===0)this.r=this.g=this.b=$;else{let Z=$<=0.5?$*(1+Q):$+Q-$*Q,K=2*$-Z;this.r=k6(K,Z,J+0.3333333333333333),this.g=k6(K,Z,J),this.b=k6(K,Z,J-0.3333333333333333)}return m0.colorSpaceToWorking(this,W),this}setStyle(J,Q="srgb"){function $(Z){if(Z===void 0)return;if(parseFloat(Z)<1)w0("Color: Alpha component of "+J+" will be ignored.")}let W;if(W=/^(\w+)\(([^\)]*)\)/.exec(J)){let Z,K=W[1],Y=W[2];switch(K){case"rgb":case"rgba":if(Z=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(Y))return $(Z[4]),this.setRGB(Math.min(255,parseInt(Z[1],10))/255,Math.min(255,parseInt(Z[2],10))/255,Math.min(255,parseInt(Z[3],10))/255,Q);if(Z=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(Y))return $(Z[4]),this.setRGB(Math.min(100,parseInt(Z[1],10))/100,Math.min(100,parseInt(Z[2],10))/100,Math.min(100,parseInt(Z[3],10))/100,Q);break;case"hsl":case"hsla":if(Z=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(Y))return $(Z[4]),this.setHSL(parseFloat(Z[1])/360,parseFloat(Z[2])/100,parseFloat(Z[3])/100,Q);break;default:w0("Color: Unknown color model "+J)}}else if(W=/^\#([A-Fa-f\d]+)$/.exec(J)){let Z=W[1],K=Z.length;if(K===3)return this.setRGB(parseInt(Z.charAt(0),16)/15,parseInt(Z.charAt(1),16)/15,parseInt(Z.charAt(2),16)/15,Q);else if(K===6)return this.setHex(parseInt(Z,16),Q);else w0("Color: Invalid hex color "+J)}else if(J&&J.length>0)return this.setColorName(J,Q);return this}setColorName(J,Q="srgb"){let $=UZ[J.toLowerCase()];if($!==void 0)this.setHex($,Q);else w0("Color: Unknown color "+J);return this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(J){return this.r=J.r,this.g=J.g,this.b=J.b,this}copySRGBToLinear(J){return this.r=B9(J.r),this.g=B9(J.g),this.b=B9(J.b),this}copyLinearToSRGB(J){return this.r=z8(J.r),this.g=z8(J.g),this.b=z8(J.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(J="srgb"){return m0.workingToColorSpace(CJ.copy(this),J),Math.round(x0(CJ.r*255,0,255))*65536+Math.round(x0(CJ.g*255,0,255))*256+Math.round(x0(CJ.b*255,0,255))}getHexString(J="srgb"){return("000000"+this.getHex(J).toString(16)).slice(-6)}getHSL(J,Q=m0.workingColorSpace){m0.workingToColorSpace(CJ.copy(this),Q);let{r:$,g:W,b:Z}=CJ,K=Math.max($,W,Z),Y=Math.min($,W,Z),X,H,U=(Y+K)/2;if(Y===K)X=0,H=0;else{let N=K-Y;switch(H=U<=0.5?N/(K+Y):N/(2-K-Y),K){case $:X=(W-Z)/N+(W<Z?6:0);break;case W:X=(Z-$)/N+2;break;case Z:X=($-W)/N+4;break}X/=6}return J.h=X,J.s=H,J.l=U,J}getRGB(J,Q=m0.workingColorSpace){return m0.workingToColorSpace(CJ.copy(this),Q),J.r=CJ.r,J.g=CJ.g,J.b=CJ.b,J}getStyle(J="srgb"){m0.workingToColorSpace(CJ.copy(this),J);let{r:Q,g:$,b:W}=CJ;if(J!=="srgb")return`color(${J} ${Q.toFixed(3)} ${$.toFixed(3)} ${W.toFixed(3)})`;return`rgb(${Math.round(Q*255)},${Math.round($*255)},${Math.round(W*255)})`}offsetHSL(J,Q,$){return this.getHSL(_9),this.setHSL(_9.h+J,_9.s+Q,_9.l+$)}add(J){return this.r+=J.r,this.g+=J.g,this.b+=J.b,this}addColors(J,Q){return this.r=J.r+Q.r,this.g=J.g+Q.g,this.b=J.b+Q.b,this}addScalar(J){return this.r+=J,this.g+=J,this.b+=J,this}sub(J){return this.r=Math.max(0,this.r-J.r),this.g=Math.max(0,this.g-J.g),this.b=Math.max(0,this.b-J.b),this}multiply(J){return this.r*=J.r,this.g*=J.g,this.b*=J.b,this}multiplyScalar(J){return this.r*=J,this.g*=J,this.b*=J,this}lerp(J,Q){return this.r+=(J.r-this.r)*Q,this.g+=(J.g-this.g)*Q,this.b+=(J.b-this.b)*Q,this}lerpColors(J,Q,$){return this.r=J.r+(Q.r-J.r)*$,this.g=J.g+(Q.g-J.g)*$,this.b=J.b+(Q.b-J.b)*$,this}lerpHSL(J,Q){this.getHSL(_9),J.getHSL(D7);let $=i8(_9.h,D7.h,Q),W=i8(_9.s,D7.s,Q),Z=i8(_9.l,D7.l,Q);return this.setHSL($,W,Z),this}setFromVector3(J){return this.r=J.x,this.g=J.y,this.b=J.z,this}applyMatrix3(J){let Q=this.r,$=this.g,W=this.b,Z=J.elements;return this.r=Z[0]*Q+Z[3]*$+Z[6]*W,this.g=Z[1]*Q+Z[4]*$+Z[7]*W,this.b=Z[2]*Q+Z[5]*$+Z[8]*W,this}equals(J){return J.r===this.r&&J.g===this.g&&J.b===this.b}fromArray(J,Q=0){return this.r=J[Q],this.g=J[Q+1],this.b=J[Q+2],this}toArray(J=[],Q=0){return J[Q]=this.r,J[Q+1]=this.g,J[Q+2]=this.b,J}fromBufferAttribute(J,Q){return this.r=J.getX(Q),this.g=J.getY(Q),this.b=J.getZ(Q),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}var CJ=new C0;C0.NAMES=UZ;class u7 extends _J{constructor(){super();if(this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new y9,this.environmentIntensity=1,this.environmentRotation=new y9,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(J,Q){if(super.copy(J,Q),J.background!==null)this.background=J.background.clone();if(J.environment!==null)this.environment=J.environment.clone();if(J.fog!==null)this.fog=J.fog.clone();if(this.backgroundBlurriness=J.backgroundBlurriness,this.backgroundIntensity=J.backgroundIntensity,this.backgroundRotation.copy(J.backgroundRotation),this.environmentIntensity=J.environmentIntensity,this.environmentRotation.copy(J.environmentRotation),J.overrideMaterial!==null)this.overrideMaterial=J.overrideMaterial.clone();return this.matrixAutoUpdate=J.matrixAutoUpdate,this}toJSON(J){let Q=super.toJSON(J);if(this.fog!==null)Q.object.fog=this.fog.toJSON();return Q.object.backgroundBlurriness=this.backgroundBlurriness,Q.object.backgroundIntensity=this.backgroundIntensity,Q.object.backgroundRotation=this.backgroundRotation.toArray(),Q.object.environmentIntensity=this.environmentIntensity,Q.object.environmentRotation=this.environmentRotation.toArray(),Q}}var J9=new v,k9=new v,M6=new v,M9=new v,F8=new v,D8=new v,r$=new v,L6=new v,V6=new v,B6=new v,I6=new GJ,z6=new GJ,A6=new GJ;class oJ{constructor(J=new v,Q=new v,$=new v){this.a=J,this.b=Q,this.c=$}static getNormal(J,Q,$,W){W.subVectors($,Q),J9.subVectors(J,Q),W.cross(J9);let Z=W.lengthSq();if(Z>0)return W.multiplyScalar(1/Math.sqrt(Z));return W.set(0,0,0)}static getBarycoord(J,Q,$,W,Z){J9.subVectors(W,Q),k9.subVectors($,Q),M6.subVectors(J,Q);let K=J9.dot(J9),Y=J9.dot(k9),X=J9.dot(M6),H=k9.dot(k9),U=k9.dot(M6),N=K*H-Y*Y;if(N===0)return Z.set(0,0,0),null;let E=1/N,G=(H*X-Y*U)*E,D=(K*U-Y*X)*E;return Z.set(1-G-D,D,G)}static containsPoint(J,Q,$,W){if(this.getBarycoord(J,Q,$,W,M9)===null)return!1;return M9.x>=0&&M9.y>=0&&M9.x+M9.y<=1}static getInterpolation(J,Q,$,W,Z,K,Y,X){if(this.getBarycoord(J,Q,$,W,M9)===null){if(X.x=0,X.y=0,"z"in X)X.z=0;if("w"in X)X.w=0;return null}return X.setScalar(0),X.addScaledVector(Z,M9.x),X.addScaledVector(K,M9.y),X.addScaledVector(Y,M9.z),X}static getInterpolatedAttribute(J,Q,$,W,Z,K){return I6.setScalar(0),z6.setScalar(0),A6.setScalar(0),I6.fromBufferAttribute(J,Q),z6.fromBufferAttribute(J,$),A6.fromBufferAttribute(J,W),K.setScalar(0),K.addScaledVector(I6,Z.x),K.addScaledVector(z6,Z.y),K.addScaledVector(A6,Z.z),K}static isFrontFacing(J,Q,$,W){return J9.subVectors($,Q),k9.subVectors(J,Q),J9.cross(k9).dot(W)<0}set(J,Q,$){return this.a.copy(J),this.b.copy(Q),this.c.copy($),this}setFromPointsAndIndices(J,Q,$,W){return this.a.copy(J[Q]),this.b.copy(J[$]),this.c.copy(J[W]),this}setFromAttributeAndIndices(J,Q,$,W){return this.a.fromBufferAttribute(J,Q),this.b.fromBufferAttribute(J,$),this.c.fromBufferAttribute(J,W),this}clone(){return new this.constructor().copy(this)}copy(J){return this.a.copy(J.a),this.b.copy(J.b),this.c.copy(J.c),this}getArea(){return J9.subVectors(this.c,this.b),k9.subVectors(this.a,this.b),J9.cross(k9).length()*0.5}getMidpoint(J){return J.addVectors(this.a,this.b).add(this.c).multiplyScalar(0.3333333333333333)}getNormal(J){return oJ.getNormal(this.a,this.b,this.c,J)}getPlane(J){return J.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(J,Q){return oJ.getBarycoord(J,this.a,this.b,this.c,Q)}getInterpolation(J,Q,$,W,Z){return oJ.getInterpolation(J,this.a,this.b,this.c,Q,$,W,Z)}containsPoint(J){return oJ.containsPoint(J,this.a,this.b,this.c)}isFrontFacing(J){return oJ.isFrontFacing(this.a,this.b,this.c,J)}intersectsBox(J){return J.intersectsTriangle(this)}closestPointToPoint(J,Q){let $=this.a,W=this.b,Z=this.c,K,Y;F8.subVectors(W,$),D8.subVectors(Z,$),L6.subVectors(J,$);let X=F8.dot(L6),H=D8.dot(L6);if(X<=0&&H<=0)return Q.copy($);V6.subVectors(J,W);let U=F8.dot(V6),N=D8.dot(V6);if(U>=0&&N<=U)return Q.copy(W);let E=X*N-U*H;if(E<=0&&X>=0&&U<=0)return K=X/(X-U),Q.copy($).addScaledVector(F8,K);B6.subVectors(J,Z);let G=F8.dot(B6),D=D8.dot(B6);if(D>=0&&G<=D)return Q.copy(Z);let M=G*H-X*D;if(M<=0&&H>=0&&D<=0)return Y=H/(H-D),Q.copy($).addScaledVector(D8,Y);let I=U*D-G*N;if(I<=0&&N-U>=0&&G-D>=0)return r$.subVectors(Z,W),Y=(N-U)/(N-U+(G-D)),Q.copy(W).addScaledVector(r$,Y);let F=1/(I+M+E);return K=M*F,Y=E*F,Q.copy($).addScaledVector(F8,K).addScaledVector(D8,Y)}equals(J){return J.a.equals(this.a)&&J.b.equals(this.b)&&J.c.equals(this.c)}}class F9{constructor(J=new v(1/0,1/0,1/0),Q=new v(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=J,this.max=Q}set(J,Q){return this.min.copy(J),this.max.copy(Q),this}setFromArray(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q+=3)this.expandByPoint(Q9.fromArray(J,Q));return this}setFromBufferAttribute(J){this.makeEmpty();for(let Q=0,$=J.count;Q<$;Q++)this.expandByPoint(Q9.fromBufferAttribute(J,Q));return this}setFromPoints(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q++)this.expandByPoint(J[Q]);return this}setFromCenterAndSize(J,Q){let $=Q9.copy(Q).multiplyScalar(0.5);return this.min.copy(J).sub($),this.max.copy(J).add($),this}setFromObject(J,Q=!1){return this.makeEmpty(),this.expandByObject(J,Q)}clone(){return new this.constructor().copy(this)}copy(J){return this.min.copy(J.min),this.max.copy(J.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(J){return this.isEmpty()?J.set(0,0,0):J.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(J){return this.isEmpty()?J.set(0,0,0):J.subVectors(this.max,this.min)}expandByPoint(J){return this.min.min(J),this.max.max(J),this}expandByVector(J){return this.min.sub(J),this.max.add(J),this}expandByScalar(J){return this.min.addScalar(-J),this.max.addScalar(J),this}expandByObject(J,Q=!1){J.updateWorldMatrix(!1,!1);let $=J.geometry;if($!==void 0){let Z=$.getAttribute("position");if(Q===!0&&Z!==void 0&&J.isInstancedMesh!==!0)for(let K=0,Y=Z.count;K<Y;K++){if(J.isMesh===!0)J.getVertexPosition(K,Q9);else Q9.fromBufferAttribute(Z,K);Q9.applyMatrix4(J.matrixWorld),this.expandByPoint(Q9)}else{if(J.boundingBox!==void 0){if(J.boundingBox===null)J.computeBoundingBox();E7.copy(J.boundingBox)}else{if($.boundingBox===null)$.computeBoundingBox();E7.copy($.boundingBox)}E7.applyMatrix4(J.matrixWorld),this.union(E7)}}let W=J.children;for(let Z=0,K=W.length;Z<K;Z++)this.expandByObject(W[Z],Q);return this}containsPoint(J){return J.x>=this.min.x&&J.x<=this.max.x&&J.y>=this.min.y&&J.y<=this.max.y&&J.z>=this.min.z&&J.z<=this.max.z}containsBox(J){return this.min.x<=J.min.x&&J.max.x<=this.max.x&&this.min.y<=J.min.y&&J.max.y<=this.max.y&&this.min.z<=J.min.z&&J.max.z<=this.max.z}getParameter(J,Q){return Q.set((J.x-this.min.x)/(this.max.x-this.min.x),(J.y-this.min.y)/(this.max.y-this.min.y),(J.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(J){return J.max.x>=this.min.x&&J.min.x<=this.max.x&&J.max.y>=this.min.y&&J.min.y<=this.max.y&&J.max.z>=this.min.z&&J.min.z<=this.max.z}intersectsSphere(J){return this.clampPoint(J.center,Q9),Q9.distanceToSquared(J.center)<=J.radius*J.radius}intersectsPlane(J){let Q,$;if(J.normal.x>0)Q=J.normal.x*this.min.x,$=J.normal.x*this.max.x;else Q=J.normal.x*this.max.x,$=J.normal.x*this.min.x;if(J.normal.y>0)Q+=J.normal.y*this.min.y,$+=J.normal.y*this.max.y;else Q+=J.normal.y*this.max.y,$+=J.normal.y*this.min.y;if(J.normal.z>0)Q+=J.normal.z*this.min.z,$+=J.normal.z*this.max.z;else Q+=J.normal.z*this.max.z,$+=J.normal.z*this.min.z;return Q<=-J.constant&&$>=-J.constant}intersectsTriangle(J){if(this.isEmpty())return!1;this.getCenter(u8),O7.subVectors(this.max,u8),E8.subVectors(J.a,u8),O8.subVectors(J.b,u8),R8.subVectors(J.c,u8),T9.subVectors(O8,E8),S9.subVectors(R8,O8),d9.subVectors(E8,R8);let Q=[0,-T9.z,T9.y,0,-S9.z,S9.y,0,-d9.z,d9.y,T9.z,0,-T9.x,S9.z,0,-S9.x,d9.z,0,-d9.x,-T9.y,T9.x,0,-S9.y,S9.x,0,-d9.y,d9.x,0];if(!P6(Q,E8,O8,R8,O7))return!1;if(Q=[1,0,0,0,1,0,0,0,1],!P6(Q,E8,O8,R8,O7))return!1;return R7.crossVectors(T9,S9),Q=[R7.x,R7.y,R7.z],P6(Q,E8,O8,R8,O7)}clampPoint(J,Q){return Q.copy(J).clamp(this.min,this.max)}distanceToPoint(J){return this.clampPoint(J,Q9).distanceTo(J)}getBoundingSphere(J){if(this.isEmpty())J.makeEmpty();else this.getCenter(J.center),J.radius=this.getSize(Q9).length()*0.5;return J}intersect(J){if(this.min.max(J.min),this.max.min(J.max),this.isEmpty())this.makeEmpty();return this}union(J){return this.min.min(J.min),this.max.max(J.max),this}applyMatrix4(J){if(this.isEmpty())return this;return L9[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(J),L9[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(J),L9[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(J),L9[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(J),L9[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(J),L9[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(J),L9[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(J),L9[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(J),this.setFromPoints(L9),this}translate(J){return this.min.add(J),this.max.add(J),this}equals(J){return J.min.equals(this.min)&&J.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(J){return this.min.fromArray(J.min),this.max.fromArray(J.max),this}}var L9=[new v,new v,new v,new v,new v,new v,new v,new v],Q9=new v,E7=new F9,E8=new v,O8=new v,R8=new v,T9=new v,S9=new v,d9=new v,u8=new v,O7=new v,R7=new v,u9=new v;function P6(J,Q,$,W,Z){for(let K=0,Y=J.length-3;K<=Y;K+=3){u9.fromArray(J,K);let X=Z.x*Math.abs(u9.x)+Z.y*Math.abs(u9.y)+Z.z*Math.abs(u9.z),H=Q.dot(u9),U=$.dot(u9),N=W.dot(u9);if(Math.max(-Math.max(H,U,N),Math.min(H,U,N))>X)return!1}return!0}var FJ=new v,k7=new j0,QY=0;class $9 extends q9{constructor(J,Q,$=!1){super();if(Array.isArray(J))throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:QY++}),this.name="",this.array=J,this.itemSize=Q,this.count=J!==void 0?J.length/Q:0,this.normalized=$,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.name=J.name,this.array=new J.array.constructor(J.array),this.itemSize=J.itemSize,this.count=J.count,this.normalized=J.normalized,this.usage=J.usage,this.gpuType=J.gpuType,this}copyAt(J,Q,$){J*=this.itemSize,$*=Q.itemSize;for(let W=0,Z=this.itemSize;W<Z;W++)this.array[J+W]=Q.array[$+W];return this}copyArray(J){return this.array.set(J),this}applyMatrix3(J){if(this.itemSize===2)for(let Q=0,$=this.count;Q<$;Q++)k7.fromBufferAttribute(this,Q),k7.applyMatrix3(J),this.setXY(Q,k7.x,k7.y);else if(this.itemSize===3)for(let Q=0,$=this.count;Q<$;Q++)FJ.fromBufferAttribute(this,Q),FJ.applyMatrix3(J),this.setXYZ(Q,FJ.x,FJ.y,FJ.z);return this}applyMatrix4(J){for(let Q=0,$=this.count;Q<$;Q++)FJ.fromBufferAttribute(this,Q),FJ.applyMatrix4(J),this.setXYZ(Q,FJ.x,FJ.y,FJ.z);return this}applyNormalMatrix(J){for(let Q=0,$=this.count;Q<$;Q++)FJ.fromBufferAttribute(this,Q),FJ.applyNormalMatrix(J),this.setXYZ(Q,FJ.x,FJ.y,FJ.z);return this}transformDirection(J){for(let Q=0,$=this.count;Q<$;Q++)FJ.fromBufferAttribute(this,Q),FJ.transformDirection(J),this.setXYZ(Q,FJ.x,FJ.y,FJ.z);return this}set(J,Q=0){return this.array.set(J,Q),this}getComponent(J,Q){let $=this.array[J*this.itemSize+Q];if(this.normalized)$=B8($,this.array);return $}setComponent(J,Q,$){if(this.normalized)$=yJ($,this.array);return this.array[J*this.itemSize+Q]=$,this}getX(J){let Q=this.array[J*this.itemSize];if(this.normalized)Q=B8(Q,this.array);return Q}setX(J,Q){if(this.normalized)Q=yJ(Q,this.array);return this.array[J*this.itemSize]=Q,this}getY(J){let Q=this.array[J*this.itemSize+1];if(this.normalized)Q=B8(Q,this.array);return Q}setY(J,Q){if(this.normalized)Q=yJ(Q,this.array);return this.array[J*this.itemSize+1]=Q,this}getZ(J){let Q=this.array[J*this.itemSize+2];if(this.normalized)Q=B8(Q,this.array);return Q}setZ(J,Q){if(this.normalized)Q=yJ(Q,this.array);return this.array[J*this.itemSize+2]=Q,this}getW(J){let Q=this.array[J*this.itemSize+3];if(this.normalized)Q=B8(Q,this.array);return Q}setW(J,Q){if(this.normalized)Q=yJ(Q,this.array);return this.array[J*this.itemSize+3]=Q,this}setXY(J,Q,$){if(J*=this.itemSize,this.normalized)Q=yJ(Q,this.array),$=yJ($,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this}setXYZ(J,Q,$,W){if(J*=this.itemSize,this.normalized)Q=yJ(Q,this.array),$=yJ($,this.array),W=yJ(W,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this.array[J+2]=W,this}setXYZW(J,Q,$,W,Z){if(J*=this.itemSize,this.normalized)Q=yJ(Q,this.array),$=yJ($,this.array),W=yJ(W,this.array),Z=yJ(Z,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this.array[J+2]=W,this.array[J+3]=Z,this}onUpload(J){return this.onUploadCallback=J,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let J={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return J.name=this.name,J.usage=this.usage,J.gpuType=this.gpuType,J}dispose(){this.dispatchEvent({type:"dispose"})}}class c7 extends $9{constructor(J,Q,$){super(new Uint16Array(J),Q,$)}}class n7 extends $9{constructor(J,Q,$){super(new Uint32Array(J),Q,$)}}class t0 extends $9{constructor(J,Q,$){super(new Float32Array(J),Q,$)}}var $Y=new F9,c8=new v,C6=new v;class Z7{constructor(J=new v,Q=-1){this.isSphere=!0,this.center=J,this.radius=Q}set(J,Q){return this.center.copy(J),this.radius=Q,this}setFromPoints(J,Q){let $=this.center;if(Q!==void 0)$.copy(Q);else $Y.setFromPoints(J).getCenter($);let W=0;for(let Z=0,K=J.length;Z<K;Z++)W=Math.max(W,$.distanceToSquared(J[Z]));return this.radius=Math.sqrt(W),this}copy(J){return this.center.copy(J.center),this.radius=J.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(J){return J.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(J){return J.distanceTo(this.center)-this.radius}intersectsSphere(J){let Q=this.radius+J.radius;return J.center.distanceToSquared(this.center)<=Q*Q}intersectsBox(J){return J.intersectsSphere(this)}intersectsPlane(J){return Math.abs(J.distanceToPoint(this.center))<=this.radius}clampPoint(J,Q){let $=this.center.distanceToSquared(J);if(Q.copy(J),$>this.radius*this.radius)Q.sub(this.center).normalize(),Q.multiplyScalar(this.radius).add(this.center);return Q}getBoundingBox(J){if(this.isEmpty())return J.makeEmpty(),J;return J.set(this.center,this.center),J.expandByScalar(this.radius),J}applyMatrix4(J){return this.center.applyMatrix4(J),this.radius=this.radius*J.getMaxScaleOnAxis(),this}translate(J){return this.center.add(J),this}expandByPoint(J){if(this.isEmpty())return this.center.copy(J),this.radius=0,this;c8.subVectors(J,this.center);let Q=c8.lengthSq();if(Q>this.radius*this.radius){let $=Math.sqrt(Q),W=($-this.radius)*0.5;this.center.addScaledVector(c8,W/$),this.radius+=W}return this}union(J){if(J.isEmpty())return this;if(this.isEmpty())return this.copy(J),this;if(this.center.equals(J.center)===!0)this.radius=Math.max(this.radius,J.radius);else C6.subVectors(J.center,this.center).setLength(J.radius),this.expandByPoint(c8.copy(J.center).add(C6)),this.expandByPoint(c8.copy(J.center).sub(C6));return this}equals(J){return J.center.equals(this.center)&&J.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(J){return this.radius=J.radius,this.center.fromArray(J.center),this}}var WY=0,sJ=new YJ,w6=new _J,k8=new v,lJ=new F9,n8=new F9,VJ=new v;class gJ extends q9{constructor(){super();this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:WY++}),this.uuid=j8(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(J){if(Array.isArray(J))this.index=new((CK(J))?n7:c7)(J,1);else this.index=J;return this}setIndirect(J,Q=0){return this.indirect=J,this.indirectOffset=Q,this}getIndirect(){return this.indirect}getAttribute(J){return this.attributes[J]}setAttribute(J,Q){return this.attributes[J]=Q,this}deleteAttribute(J){return delete this.attributes[J],this}hasAttribute(J){return this.attributes[J]!==void 0}addGroup(J,Q,$=0){this.groups.push({start:J,count:Q,materialIndex:$})}clearGroups(){this.groups=[]}setDrawRange(J,Q){this.drawRange.start=J,this.drawRange.count=Q}applyMatrix4(J){let Q=this.attributes.position;if(Q!==void 0)Q.applyMatrix4(J),Q.needsUpdate=!0;let $=this.attributes.normal;if($!==void 0){let Z=new y0().getNormalMatrix(J);$.applyNormalMatrix(Z),$.needsUpdate=!0}let W=this.attributes.tangent;if(W!==void 0)W.transformDirection(J),W.needsUpdate=!0;if(this.boundingBox!==null)this.computeBoundingBox();if(this.boundingSphere!==null)this.computeBoundingSphere();return this._transformed=!0,this}applyQuaternion(J){return sJ.makeRotationFromQuaternion(J),this.applyMatrix4(sJ),this}rotateX(J){return sJ.makeRotationX(J),this.applyMatrix4(sJ),this}rotateY(J){return sJ.makeRotationY(J),this.applyMatrix4(sJ),this}rotateZ(J){return sJ.makeRotationZ(J),this.applyMatrix4(sJ),this}translate(J,Q,$){return sJ.makeTranslation(J,Q,$),this.applyMatrix4(sJ),this}scale(J,Q,$){return sJ.makeScale(J,Q,$),this.applyMatrix4(sJ),this}lookAt(J){return w6.lookAt(J),w6.updateMatrix(),this.applyMatrix4(w6.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(k8).negate(),this.translate(k8.x,k8.y,k8.z),this}setFromPoints(J){let Q=this.getAttribute("position");if(Q===void 0){let $=[];for(let W=0,Z=J.length;W<Z;W++){let K=J[W];$.push(K.x,K.y,K.z||0)}this.setAttribute("position",new t0($,3))}else{let $=Math.min(J.length,Q.count);for(let W=0;W<$;W++){let Z=J[W];Q.setXYZ(W,Z.x,Z.y,Z.z||0)}if(J.length>Q.count)w0("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.");Q.needsUpdate=!0}return this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new F9;let J=this.attributes.position,Q=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){S0("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new v(-1/0,-1/0,-1/0),new v(1/0,1/0,1/0));return}if(J!==void 0){if(this.boundingBox.setFromBufferAttribute(J),Q)for(let $=0,W=Q.length;$<W;$++){let Z=Q[$];if(lJ.setFromBufferAttribute(Z),this.morphTargetsRelative)VJ.addVectors(this.boundingBox.min,lJ.min),this.boundingBox.expandByPoint(VJ),VJ.addVectors(this.boundingBox.max,lJ.max),this.boundingBox.expandByPoint(VJ);else this.boundingBox.expandByPoint(lJ.min),this.boundingBox.expandByPoint(lJ.max)}}else this.boundingBox.makeEmpty();if(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))S0('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new Z7;let J=this.attributes.position,Q=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){S0("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new v,1/0);return}if(J){let $=this.boundingSphere.center;if(lJ.setFromBufferAttribute(J),Q)for(let Z=0,K=Q.length;Z<K;Z++){let Y=Q[Z];if(n8.setFromBufferAttribute(Y),this.morphTargetsRelative)VJ.addVectors(lJ.min,n8.min),lJ.expandByPoint(VJ),VJ.addVectors(lJ.max,n8.max),lJ.expandByPoint(VJ);else lJ.expandByPoint(n8.min),lJ.expandByPoint(n8.max)}lJ.getCenter($);let W=0;for(let Z=0,K=J.count;Z<K;Z++)VJ.fromBufferAttribute(J,Z),W=Math.max(W,$.distanceToSquared(VJ));if(Q)for(let Z=0,K=Q.length;Z<K;Z++){let Y=Q[Z],X=this.morphTargetsRelative;for(let H=0,U=Y.count;H<U;H++){if(VJ.fromBufferAttribute(Y,H),X)k8.fromBufferAttribute(J,H),VJ.add(k8);W=Math.max(W,$.distanceToSquared(VJ))}}if(this.boundingSphere.radius=Math.sqrt(W),isNaN(this.boundingSphere.radius))S0('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let J=this.index,Q=this.attributes;if(J===null||Q.position===void 0||Q.normal===void 0||Q.uv===void 0){S0("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let{position:$,normal:W,uv:Z}=Q,K=this.getAttribute("tangent");if(K===void 0||K.count!==$.count)K=new $9(new Float32Array(4*$.count),4),this.setAttribute("tangent",K);let Y=[],X=[];for(let C=0;C<$.count;C++)Y[C]=new v,X[C]=new v;let H=new v,U=new v,N=new v,E=new j0,G=new j0,D=new j0,M=new v,I=new v;function F(C,k,B){H.fromBufferAttribute($,C),U.fromBufferAttribute($,k),N.fromBufferAttribute($,B),E.fromBufferAttribute(Z,C),G.fromBufferAttribute(Z,k),D.fromBufferAttribute(Z,B),U.sub(H),N.sub(H),G.sub(E),D.sub(E);let g=1/(G.x*D.y-D.x*G.y);if(!isFinite(g))return;M.copy(U).multiplyScalar(D.y).addScaledVector(N,-G.y).multiplyScalar(g),I.copy(N).multiplyScalar(G.x).addScaledVector(U,-D.x).multiplyScalar(g),Y[C].add(M),Y[k].add(M),Y[B].add(M),X[C].add(I),X[k].add(I),X[B].add(I)}let q=this.groups;if(q.length===0)q=[{start:0,count:J.count}];for(let C=0,k=q.length;C<k;++C){let B=q[C],g=B.start,f=B.count;for(let h=g,a=g+f;h<a;h+=3)F(J.getX(h+0),J.getX(h+1),J.getX(h+2))}let A=new v,j=new v,V=new v,z=new v;function P(C){V.fromBufferAttribute(W,C),z.copy(V);let k=Y[C];A.copy(k),A.sub(V.multiplyScalar(V.dot(k))).normalize(),j.crossVectors(z,k);let g=j.dot(X[C])<0?-1:1;K.setXYZW(C,A.x,A.y,A.z,g)}for(let C=0,k=q.length;C<k;++C){let B=q[C],g=B.start,f=B.count;for(let h=g,a=g+f;h<a;h+=3)P(J.getX(h+0)),P(J.getX(h+1)),P(J.getX(h+2))}this._transformed=!0}computeVertexNormals(){let J=this.index,Q=this.getAttribute("position");if(Q!==void 0){let $=this.getAttribute("normal");if($===void 0||$.count!==Q.count)$=new $9(new Float32Array(Q.count*3),3),this.setAttribute("normal",$);else for(let E=0,G=$.count;E<G;E++)$.setXYZ(E,0,0,0);let W=new v,Z=new v,K=new v,Y=new v,X=new v,H=new v,U=new v,N=new v;if(J)for(let E=0,G=J.count;E<G;E+=3){let D=J.getX(E+0),M=J.getX(E+1),I=J.getX(E+2);W.fromBufferAttribute(Q,D),Z.fromBufferAttribute(Q,M),K.fromBufferAttribute(Q,I),U.subVectors(K,Z),N.subVectors(W,Z),U.cross(N),Y.fromBufferAttribute($,D),X.fromBufferAttribute($,M),H.fromBufferAttribute($,I),Y.add(U),X.add(U),H.add(U),$.setXYZ(D,Y.x,Y.y,Y.z),$.setXYZ(M,X.x,X.y,X.z),$.setXYZ(I,H.x,H.y,H.z)}else for(let E=0,G=Q.count;E<G;E+=3)W.fromBufferAttribute(Q,E+0),Z.fromBufferAttribute(Q,E+1),K.fromBufferAttribute(Q,E+2),U.subVectors(K,Z),N.subVectors(W,Z),U.cross(N),$.setXYZ(E+0,U.x,U.y,U.z),$.setXYZ(E+1,U.x,U.y,U.z),$.setXYZ(E+2,U.x,U.y,U.z);this.normalizeNormals(),$.needsUpdate=!0}}normalizeNormals(){let J=this.attributes.normal;for(let Q=0,$=J.count;Q<$;Q++)VJ.fromBufferAttribute(J,Q),VJ.normalize(),J.setXYZ(Q,VJ.x,VJ.y,VJ.z)}toNonIndexed(){function J(Y,X){let{array:H,itemSize:U,normalized:N}=Y,E=new H.constructor(X.length*U),G=0,D=0;for(let M=0,I=X.length;M<I;M++){if(Y.isInterleavedBufferAttribute)G=X[M]*Y.data.stride+Y.offset;else G=X[M]*U;for(let F=0;F<U;F++)E[D++]=H[G++]}return new $9(E,U,N)}if(this.index===null)return w0("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let Q=new gJ,$=this.index.array,W=this.attributes;for(let Y in W){let X=W[Y],H=J(X,$);Q.setAttribute(Y,H)}let Z=this.morphAttributes;for(let Y in Z){let X=[],H=Z[Y];for(let U=0,N=H.length;U<N;U++){let E=H[U],G=J(E,$);X.push(G)}Q.morphAttributes[Y]=X}Q.morphTargetsRelative=this.morphTargetsRelative;let K=this.groups;for(let Y=0,X=K.length;Y<X;Y++){let H=K[Y];Q.addGroup(H.start,H.count,H.materialIndex)}return Q}toJSON(){let J={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(J.uuid=this.uuid,J.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,J.name=this.name,Object.keys(this.userData).length>0)J.userData=this.userData;if(this.parameters!==void 0&&this._transformed!==!0){let X=this.parameters;for(let H in X)if(X[H]!==void 0)J[H]=X[H];return J}J.data={attributes:{}};let Q=this.index;if(Q!==null)J.data.index={type:Q.array.constructor.name,array:Array.prototype.slice.call(Q.array)};let $=this.attributes;for(let X in $){let H=$[X];J.data.attributes[X]=H.toJSON(J.data)}let W={},Z=!1;for(let X in this.morphAttributes){let H=this.morphAttributes[X],U=[];for(let N=0,E=H.length;N<E;N++){let G=H[N];U.push(G.toJSON(J.data))}if(U.length>0)W[X]=U,Z=!0}if(Z)J.data.morphAttributes=W,J.data.morphTargetsRelative=this.morphTargetsRelative;let K=this.groups;if(K.length>0)J.data.groups=JSON.parse(JSON.stringify(K));let Y=this.boundingSphere;if(Y!==null)J.data.boundingSphere=Y.toJSON();return J}clone(){return new this.constructor().copy(this)}copy(J){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let Q={};this.name=J.name;let $=J.index;if($!==null)this.setIndex($.clone());let W=J.attributes;for(let H in W){let U=W[H];this.setAttribute(H,U.clone(Q))}let Z=J.morphAttributes;for(let H in Z){let U=[],N=Z[H];for(let E=0,G=N.length;E<G;E++)U.push(N[E].clone(Q));this.morphAttributes[H]=U}this.morphTargetsRelative=J.morphTargetsRelative;let K=J.groups;for(let H=0,U=K.length;H<U;H++){let N=K[H];this.addGroup(N.start,N.count,N.materialIndex)}let Y=J.boundingBox;if(Y!==null)this.boundingBox=Y.clone();let X=J.boundingSphere;if(X!==null)this.boundingSphere=X.clone();return this.drawRange.start=J.drawRange.start,this.drawRange.count=J.drawRange.count,this.userData=J.userData,this._transformed=J._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}var _6=new v,ZY=new v,KY=new y0;class iJ{constructor(J=new v(1,0,0),Q=0){this.isPlane=!0,this.normal=J,this.constant=Q}set(J,Q){return this.normal.copy(J),this.constant=Q,this}setComponents(J,Q,$,W){return this.normal.set(J,Q,$),this.constant=W,this}setFromNormalAndCoplanarPoint(J,Q){return this.normal.copy(J),this.constant=-Q.dot(this.normal),this}setFromCoplanarPoints(J,Q,$){let W=_6.subVectors($,Q).cross(ZY.subVectors(J,Q)).normalize();return this.setFromNormalAndCoplanarPoint(W,J),this}copy(J){return this.normal.copy(J.normal),this.constant=J.constant,this}normalize(){let J=1/this.normal.length();return this.normal.multiplyScalar(J),this.constant*=J,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(J){return this.normal.dot(J)+this.constant}distanceToSphere(J){return this.distanceToPoint(J.center)-J.radius}projectPoint(J,Q){return Q.copy(J).addScaledVector(this.normal,-this.distanceToPoint(J))}intersectLine(J,Q,$=!0){let W=J.delta(_6),Z=this.normal.dot(W);if(Z===0){if(this.distanceToPoint(J.start)===0)return Q.copy(J.start);return null}let K=-(J.start.dot(this.normal)+this.constant)/Z;if($===!0&&(K<0||K>1))return null;return Q.copy(J.start).addScaledVector(W,K)}intersectsLine(J){let Q=this.distanceToPoint(J.start),$=this.distanceToPoint(J.end);return Q<0&&$>0||$<0&&Q>0}intersectsBox(J){return J.intersectsPlane(this)}intersectsSphere(J){return J.intersectsPlane(this)}coplanarPoint(J){return J.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(J,Q){let $=Q||KY.getNormalMatrix(J),W=this.coplanarPoint(_6).applyMatrix4(J),Z=this.normal.applyMatrix3($).normalize();return this.constant=-W.dot(Z),this}translate(J){return this.constant-=J.dot(this.normal),this}equals(J){return J.normal.equals(this.normal)&&J.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(J){return this.normal.fromArray(J.normal),this.constant=J.constant,this}}var YY=0;class y8 extends q9{constructor(){super();this.isMaterial=!0,Object.defineProperty(this,"id",{value:YY++}),this.uuid=j8(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new C0(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(J){if(this._alphaTest>0!==J>0)this.version++;this._alphaTest=J}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(J){if(J===void 0)return;for(let Q in J){let $=J[Q];if($===void 0){w0(`Material: parameter '${Q}' has value of undefined.`);continue}let W=this[Q];if(W===void 0){w0(`Material: '${Q}' is not a property of THREE.${this.type}.`);continue}if(W&&W.isColor)W.set($);else if(W&&W.isVector2&&($&&$.isVector2)||W&&W.isEuler&&($&&$.isEuler)||W&&W.isVector3&&($&&$.isVector3))W.copy($);else this[Q]=$}}toJSON(J){let Q=J===void 0||typeof J==="string";if(Q)J={textures:{},images:{}};let $={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};if($.uuid=this.uuid,$.type=this.type,$.blending=this.blending,$.side=this.side,$.shadowSide=this.shadowSide,$.vertexColors=this.vertexColors,$.opacity=this.opacity,$.transparent=this.transparent,$.blendSrc=this.blendSrc,$.blendDst=this.blendDst,$.blendEquation=this.blendEquation,$.blendSrcAlpha=this.blendSrcAlpha,$.blendDstAlpha=this.blendDstAlpha,$.blendEquationAlpha=this.blendEquationAlpha,$.blendColor=this.blendColor.getHex(),$.blendAlpha=this.blendAlpha,$.depthFunc=this.depthFunc,$.depthTest=this.depthTest,$.depthWrite=this.depthWrite,$.colorWrite=this.colorWrite,$.clipIntersection=this.clipIntersection,$.clipShadows=this.clipShadows,$.stencilWriteMask=this.stencilWriteMask,$.stencilFunc=this.stencilFunc,$.stencilRef=this.stencilRef,$.stencilFuncMask=this.stencilFuncMask,$.stencilFail=this.stencilFail,$.stencilZFail=this.stencilZFail,$.stencilZPass=this.stencilZPass,$.stencilWrite=this.stencilWrite,$.polygonOffset=this.polygonOffset,$.polygonOffsetFactor=this.polygonOffsetFactor,$.polygonOffsetUnits=this.polygonOffsetUnits,$.dithering=this.dithering,$.alphaTest=this.alphaTest,$.alphaHash=this.alphaHash,$.alphaToCoverage=this.alphaToCoverage,$.premultipliedAlpha=this.premultipliedAlpha,$.forceSinglePass=this.forceSinglePass,$.allowOverride=this.allowOverride,$.visible=this.visible,$.toneMapped=this.toneMapped,$.name=this.name,this.color&&this.color.isColor)$.color=this.color.getHex();if(this.roughness!==void 0)$.roughness=this.roughness;if(this.metalness!==void 0)$.metalness=this.metalness;if(this.sheen!==void 0)$.sheen=this.sheen;if(this.sheenColor&&this.sheenColor.isColor)$.sheenColor=this.sheenColor.getHex();if(this.sheenRoughness!==void 0)$.sheenRoughness=this.sheenRoughness;if(this.emissive&&this.emissive.isColor)$.emissive=this.emissive.getHex();if(this.emissiveIntensity!==void 0)$.emissiveIntensity=this.emissiveIntensity;if(this.specular&&this.specular.isColor)$.specular=this.specular.getHex();if(this.specularIntensity!==void 0)$.specularIntensity=this.specularIntensity;if(this.specularColor&&this.specularColor.isColor)$.specularColor=this.specularColor.getHex();if(this.shininess!==void 0)$.shininess=this.shininess;if(this.clearcoat!==void 0)$.clearcoat=this.clearcoat;if(this.clearcoatRoughness!==void 0)$.clearcoatRoughness=this.clearcoatRoughness;if(this.clearcoatMap&&this.clearcoatMap.isTexture)$.clearcoatMap=this.clearcoatMap.toJSON(J).uuid;if(this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture)$.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(J).uuid;if(this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture)$.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(J).uuid,$.clearcoatNormalScale=this.clearcoatNormalScale.toArray();if(this.sheenColorMap&&this.sheenColorMap.isTexture)$.sheenColorMap=this.sheenColorMap.toJSON(J).uuid;if(this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture)$.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(J).uuid;if(this.dispersion!==void 0)$.dispersion=this.dispersion;if(this.retroreflectivity!==void 0)$.retroreflectivity=this.retroreflectivity;if(this.iridescence!==void 0)$.iridescence=this.iridescence;if(this.iridescenceIOR!==void 0)$.iridescenceIOR=this.iridescenceIOR;if(this.iridescenceThicknessRange!==void 0)$.iridescenceThicknessRange=this.iridescenceThicknessRange;if(this.iridescenceMap&&this.iridescenceMap.isTexture)$.iridescenceMap=this.iridescenceMap.toJSON(J).uuid;if(this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture)$.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(J).uuid;if(this.anisotropy!==void 0)$.anisotropy=this.anisotropy;if(this.anisotropyRotation!==void 0)$.anisotropyRotation=this.anisotropyRotation;if(this.anisotropyMap&&this.anisotropyMap.isTexture)$.anisotropyMap=this.anisotropyMap.toJSON(J).uuid;if(this.map&&this.map.isTexture)$.map=this.map.toJSON(J).uuid;if(this.matcap&&this.matcap.isTexture)$.matcap=this.matcap.toJSON(J).uuid;if(this.alphaMap&&this.alphaMap.isTexture)$.alphaMap=this.alphaMap.toJSON(J).uuid;if(this.lightMap&&this.lightMap.isTexture)$.lightMap=this.lightMap.toJSON(J).uuid,$.lightMapIntensity=this.lightMapIntensity;if(this.aoMap&&this.aoMap.isTexture)$.aoMap=this.aoMap.toJSON(J).uuid,$.aoMapIntensity=this.aoMapIntensity;if(this.bumpMap&&this.bumpMap.isTexture)$.bumpMap=this.bumpMap.toJSON(J).uuid,$.bumpScale=this.bumpScale;if(this.normalMap&&this.normalMap.isTexture)$.normalMap=this.normalMap.toJSON(J).uuid,$.normalMapType=this.normalMapType,$.normalScale=this.normalScale.toArray();if(this.displacementMap&&this.displacementMap.isTexture)$.displacementMap=this.displacementMap.toJSON(J).uuid,$.displacementScale=this.displacementScale,$.displacementBias=this.displacementBias;if(this.roughnessMap&&this.roughnessMap.isTexture)$.roughnessMap=this.roughnessMap.toJSON(J).uuid;if(this.metalnessMap&&this.metalnessMap.isTexture)$.metalnessMap=this.metalnessMap.toJSON(J).uuid;if(this.emissiveMap&&this.emissiveMap.isTexture)$.emissiveMap=this.emissiveMap.toJSON(J).uuid;if(this.specularMap&&this.specularMap.isTexture)$.specularMap=this.specularMap.toJSON(J).uuid;if(this.specularIntensityMap&&this.specularIntensityMap.isTexture)$.specularIntensityMap=this.specularIntensityMap.toJSON(J).uuid;if(this.specularColorMap&&this.specularColorMap.isTexture)$.specularColorMap=this.specularColorMap.toJSON(J).uuid;if(this.envMap&&this.envMap.isTexture){if($.envMap=this.envMap.toJSON(J).uuid,this.combine!==void 0)$.combine=this.combine}if(this.envMapRotation!==void 0)$.envMapRotation=this.envMapRotation.toArray();if(this.envMapIntensity!==void 0)$.envMapIntensity=this.envMapIntensity;if(this.reflectivity!==void 0)$.reflectivity=this.reflectivity;if(this.refractionRatio!==void 0)$.refractionRatio=this.refractionRatio;if(this.gradientMap&&this.gradientMap.isTexture)$.gradientMap=this.gradientMap.toJSON(J).uuid;if(this.transmission!==void 0)$.transmission=this.transmission;if(this.transmissionMap&&this.transmissionMap.isTexture)$.transmissionMap=this.transmissionMap.toJSON(J).uuid;if(this.thickness!==void 0)$.thickness=this.thickness;if(this.thicknessMap&&this.thicknessMap.isTexture)$.thicknessMap=this.thicknessMap.toJSON(J).uuid;if(this.attenuationDistance!==void 0)$.attenuationDistance=this.attenuationDistance;if(this.attenuationColor!==void 0)$.attenuationColor=this.attenuationColor.getHex();if(this.size!==void 0)$.size=this.size;if(this.sizeAttenuation!==void 0)$.sizeAttenuation=this.sizeAttenuation;if(Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0)$.clippingPlanes=this.clippingPlanes.map((Z)=>Z.toJSON());if(this.rotation!==void 0)$.rotation=this.rotation;if(this.depthPacking!==void 0)$.depthPacking=this.depthPacking;if(this.linewidth!==void 0)$.linewidth=this.linewidth;if(this.linecap!==void 0)$.linecap=this.linecap;if(this.linejoin!==void 0)$.linejoin=this.linejoin;if(this.dashSize!==void 0)$.dashSize=this.dashSize;if(this.gapSize!==void 0)$.gapSize=this.gapSize;if(this.scale!==void 0)$.scale=this.scale;if(this.wireframe!==void 0)$.wireframe=this.wireframe;if(this.wireframeLinewidth!==void 0)$.wireframeLinewidth=this.wireframeLinewidth;if(this.wireframeLinecap!==void 0)$.wireframeLinecap=this.wireframeLinecap;if(this.wireframeLinejoin!==void 0)$.wireframeLinejoin=this.wireframeLinejoin;if(this.flatShading!==void 0)$.flatShading=this.flatShading;if(this.fog!==void 0)$.fog=this.fog;if(Object.keys(this.userData).length>0)$.userData=this.userData;function W(Z){let K=[];for(let Y in Z){let X=Z[Y];delete X.metadata,K.push(X)}return K}if(Q){let Z=W(J.textures),K=W(J.images);if(Z.length>0)$.textures=Z;if(K.length>0)$.images=K}return $}fromJSON(J,Q){if(J.uuid!==void 0)this.uuid=J.uuid;if(J.name!==void 0)this.name=J.name;if(J.color!==void 0&&this.color!==void 0)this.color.setHex(J.color);if(J.roughness!==void 0)this.roughness=J.roughness;if(J.metalness!==void 0)this.metalness=J.metalness;if(J.sheen!==void 0)this.sheen=J.sheen;if(J.sheenColor!==void 0)this.sheenColor=new C0().setHex(J.sheenColor);if(J.sheenRoughness!==void 0)this.sheenRoughness=J.sheenRoughness;if(J.emissive!==void 0&&this.emissive!==void 0)this.emissive.setHex(J.emissive);if(J.specular!==void 0&&this.specular!==void 0)this.specular.setHex(J.specular);if(J.specularIntensity!==void 0)this.specularIntensity=J.specularIntensity;if(J.specularColor!==void 0&&this.specularColor!==void 0)this.specularColor.setHex(J.specularColor);if(J.shininess!==void 0)this.shininess=J.shininess;if(J.clearcoat!==void 0)this.clearcoat=J.clearcoat;if(J.clearcoatRoughness!==void 0)this.clearcoatRoughness=J.clearcoatRoughness;if(J.dispersion!==void 0)this.dispersion=J.dispersion;if(J.retroreflectivity!==void 0)this.retroreflectivity=J.retroreflectivity;if(J.iridescence!==void 0)this.iridescence=J.iridescence;if(J.iridescenceIOR!==void 0)this.iridescenceIOR=J.iridescenceIOR;if(J.iridescenceThicknessRange!==void 0)this.iridescenceThicknessRange=J.iridescenceThicknessRange;if(J.transmission!==void 0)this.transmission=J.transmission;if(J.thickness!==void 0)this.thickness=J.thickness;if(J.attenuationDistance!==void 0)this.attenuationDistance=J.attenuationDistance;if(J.attenuationColor!==void 0&&this.attenuationColor!==void 0)this.attenuationColor.setHex(J.attenuationColor);if(J.anisotropy!==void 0)this.anisotropy=J.anisotropy;if(J.anisotropyRotation!==void 0)this.anisotropyRotation=J.anisotropyRotation;if(J.fog!==void 0)this.fog=J.fog;if(J.flatShading!==void 0)this.flatShading=J.flatShading;if(J.blending!==void 0)this.blending=J.blending;if(J.combine!==void 0)this.combine=J.combine;if(J.side!==void 0)this.side=J.side;if(J.shadowSide!==void 0)this.shadowSide=J.shadowSide;if(J.opacity!==void 0)this.opacity=J.opacity;if(J.transparent!==void 0)this.transparent=J.transparent;if(J.alphaTest!==void 0)this.alphaTest=J.alphaTest;if(J.alphaHash!==void 0)this.alphaHash=J.alphaHash;if(J.depthFunc!==void 0)this.depthFunc=J.depthFunc;if(J.depthTest!==void 0)this.depthTest=J.depthTest;if(J.depthWrite!==void 0)this.depthWrite=J.depthWrite;if(J.colorWrite!==void 0)this.colorWrite=J.colorWrite;if(J.clippingPlanes!==void 0)this.clippingPlanes=J.clippingPlanes.map(($)=>new iJ().fromJSON($));if(J.clipIntersection!==void 0)this.clipIntersection=J.clipIntersection;if(J.clipShadows!==void 0)this.clipShadows=J.clipShadows;if(J.depthPacking!==void 0)this.depthPacking=J.depthPacking;if(J.blendSrc!==void 0)this.blendSrc=J.blendSrc;if(J.blendDst!==void 0)this.blendDst=J.blendDst;if(J.blendEquation!==void 0)this.blendEquation=J.blendEquation;if(J.blendSrcAlpha!==void 0)this.blendSrcAlpha=J.blendSrcAlpha;if(J.blendDstAlpha!==void 0)this.blendDstAlpha=J.blendDstAlpha;if(J.blendEquationAlpha!==void 0)this.blendEquationAlpha=J.blendEquationAlpha;if(J.blendColor!==void 0&&this.blendColor!==void 0)this.blendColor.setHex(J.blendColor);if(J.blendAlpha!==void 0)this.blendAlpha=J.blendAlpha;if(J.stencilWriteMask!==void 0)this.stencilWriteMask=J.stencilWriteMask;if(J.stencilFunc!==void 0)this.stencilFunc=J.stencilFunc;if(J.stencilRef!==void 0)this.stencilRef=J.stencilRef;if(J.stencilFuncMask!==void 0)this.stencilFuncMask=J.stencilFuncMask;if(J.stencilFail!==void 0)this.stencilFail=J.stencilFail;if(J.stencilZFail!==void 0)this.stencilZFail=J.stencilZFail;if(J.stencilZPass!==void 0)this.stencilZPass=J.stencilZPass;if(J.stencilWrite!==void 0)this.stencilWrite=J.stencilWrite;if(J.wireframe!==void 0)this.wireframe=J.wireframe;if(J.wireframeLinewidth!==void 0)this.wireframeLinewidth=J.wireframeLinewidth;if(J.wireframeLinecap!==void 0)this.wireframeLinecap=J.wireframeLinecap;if(J.wireframeLinejoin!==void 0)this.wireframeLinejoin=J.wireframeLinejoin;if(J.rotation!==void 0)this.rotation=J.rotation;if(J.linewidth!==void 0)this.linewidth=J.linewidth;if(J.linecap!==void 0)this.linecap=J.linecap;if(J.linejoin!==void 0)this.linejoin=J.linejoin;if(J.dashSize!==void 0)this.dashSize=J.dashSize;if(J.gapSize!==void 0)this.gapSize=J.gapSize;if(J.scale!==void 0)this.scale=J.scale;if(J.polygonOffset!==void 0)this.polygonOffset=J.polygonOffset;if(J.polygonOffsetFactor!==void 0)this.polygonOffsetFactor=J.polygonOffsetFactor;if(J.polygonOffsetUnits!==void 0)this.polygonOffsetUnits=J.polygonOffsetUnits;if(J.dithering!==void 0)this.dithering=J.dithering;if(J.alphaToCoverage!==void 0)this.alphaToCoverage=J.alphaToCoverage;if(J.premultipliedAlpha!==void 0)this.premultipliedAlpha=J.premultipliedAlpha;if(J.forceSinglePass!==void 0)this.forceSinglePass=J.forceSinglePass;if(J.allowOverride!==void 0)this.allowOverride=J.allowOverride;if(J.visible!==void 0)this.visible=J.visible;if(J.toneMapped!==void 0)this.toneMapped=J.toneMapped;if(J.userData!==void 0)this.userData=J.userData;if(J.vertexColors!==void 0)if(typeof J.vertexColors==="number")this.vertexColors=J.vertexColors>0;else this.vertexColors=J.vertexColors;if(J.size!==void 0)this.size=J.size;if(J.sizeAttenuation!==void 0)this.sizeAttenuation=J.sizeAttenuation;if(J.map!==void 0)this.map=Q[J.map]||null;if(J.matcap!==void 0)this.matcap=Q[J.matcap]||null;if(J.alphaMap!==void 0)this.alphaMap=Q[J.alphaMap]||null;if(J.bumpMap!==void 0)this.bumpMap=Q[J.bumpMap]||null;if(J.bumpScale!==void 0)this.bumpScale=J.bumpScale;if(J.normalMap!==void 0)this.normalMap=Q[J.normalMap]||null;if(J.normalMapType!==void 0)this.normalMapType=J.normalMapType;if(J.normalScale!==void 0){let $=J.normalScale;if(Array.isArray($)===!1)$=[$,$];this.normalScale=new j0().fromArray($)}if(J.displacementMap!==void 0)this.displacementMap=Q[J.displacementMap]||null;if(J.displacementScale!==void 0)this.displacementScale=J.displacementScale;if(J.displacementBias!==void 0)this.displacementBias=J.displacementBias;if(J.roughnessMap!==void 0)this.roughnessMap=Q[J.roughnessMap]||null;if(J.metalnessMap!==void 0)this.metalnessMap=Q[J.metalnessMap]||null;if(J.emissiveMap!==void 0)this.emissiveMap=Q[J.emissiveMap]||null;if(J.emissiveIntensity!==void 0)this.emissiveIntensity=J.emissiveIntensity;if(J.specularMap!==void 0)this.specularMap=Q[J.specularMap]||null;if(J.specularIntensityMap!==void 0)this.specularIntensityMap=Q[J.specularIntensityMap]||null;if(J.specularColorMap!==void 0)this.specularColorMap=Q[J.specularColorMap]||null;if(J.envMap!==void 0)this.envMap=Q[J.envMap]||null;if(J.envMapRotation!==void 0)this.envMapRotation.fromArray(J.envMapRotation);if(J.envMapIntensity!==void 0)this.envMapIntensity=J.envMapIntensity;if(J.reflectivity!==void 0)this.reflectivity=J.reflectivity;if(J.refractionRatio!==void 0)this.refractionRatio=J.refractionRatio;if(J.lightMap!==void 0)this.lightMap=Q[J.lightMap]||null;if(J.lightMapIntensity!==void 0)this.lightMapIntensity=J.lightMapIntensity;if(J.aoMap!==void 0)this.aoMap=Q[J.aoMap]||null;if(J.aoMapIntensity!==void 0)this.aoMapIntensity=J.aoMapIntensity;if(J.gradientMap!==void 0)this.gradientMap=Q[J.gradientMap]||null;if(J.clearcoatMap!==void 0)this.clearcoatMap=Q[J.clearcoatMap]||null;if(J.clearcoatRoughnessMap!==void 0)this.clearcoatRoughnessMap=Q[J.clearcoatRoughnessMap]||null;if(J.clearcoatNormalMap!==void 0)this.clearcoatNormalMap=Q[J.clearcoatNormalMap]||null;if(J.clearcoatNormalScale!==void 0)this.clearcoatNormalScale=new j0().fromArray(J.clearcoatNormalScale);if(J.iridescenceMap!==void 0)this.iridescenceMap=Q[J.iridescenceMap]||null;if(J.iridescenceThicknessMap!==void 0)this.iridescenceThicknessMap=Q[J.iridescenceThicknessMap]||null;if(J.transmissionMap!==void 0)this.transmissionMap=Q[J.transmissionMap]||null;if(J.thicknessMap!==void 0)this.thicknessMap=Q[J.thicknessMap]||null;if(J.anisotropyMap!==void 0)this.anisotropyMap=Q[J.anisotropyMap]||null;if(J.sheenColorMap!==void 0)this.sheenColorMap=Q[J.sheenColorMap]||null;if(J.sheenRoughnessMap!==void 0)this.sheenRoughnessMap=Q[J.sheenRoughnessMap]||null;return this}clone(){return new this.constructor().copy(this)}copy(J){this.name=J.name,this.blending=J.blending,this.side=J.side,this.vertexColors=J.vertexColors,this.opacity=J.opacity,this.transparent=J.transparent,this.blendSrc=J.blendSrc,this.blendDst=J.blendDst,this.blendEquation=J.blendEquation,this.blendSrcAlpha=J.blendSrcAlpha,this.blendDstAlpha=J.blendDstAlpha,this.blendEquationAlpha=J.blendEquationAlpha,this.blendColor.copy(J.blendColor),this.blendAlpha=J.blendAlpha,this.depthFunc=J.depthFunc,this.depthTest=J.depthTest,this.depthWrite=J.depthWrite,this.stencilWriteMask=J.stencilWriteMask,this.stencilFunc=J.stencilFunc,this.stencilRef=J.stencilRef,this.stencilFuncMask=J.stencilFuncMask,this.stencilFail=J.stencilFail,this.stencilZFail=J.stencilZFail,this.stencilZPass=J.stencilZPass,this.stencilWrite=J.stencilWrite;let Q=J.clippingPlanes,$=null;if(Q!==null){let W=Q.length;$=Array(W);for(let Z=0;Z!==W;++Z)$[Z]=Q[Z].clone()}return this.clippingPlanes=$,this.clipIntersection=J.clipIntersection,this.clipShadows=J.clipShadows,this.shadowSide=J.shadowSide,this.colorWrite=J.colorWrite,this.precision=J.precision,this.polygonOffset=J.polygonOffset,this.polygonOffsetFactor=J.polygonOffsetFactor,this.polygonOffsetUnits=J.polygonOffsetUnits,this.dithering=J.dithering,this.alphaTest=J.alphaTest,this.alphaHash=J.alphaHash,this.alphaToCoverage=J.alphaToCoverage,this.premultipliedAlpha=J.premultipliedAlpha,this.forceSinglePass=J.forceSinglePass,this.allowOverride=J.allowOverride,this.visible=J.visible,this.toneMapped=J.toneMapped,this.userData=JSON.parse(JSON.stringify(J.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(J){if(J===!0)this.version++}}var V9=new v,T6=new v,M7=new v,L7=new v;class f8{constructor(J=new v,Q=new v(0,0,-1)){this.origin=J,this.direction=Q}set(J,Q){return this.origin.copy(J),this.direction.copy(Q),this}copy(J){return this.origin.copy(J.origin),this.direction.copy(J.direction),this}at(J,Q){return Q.copy(this.origin).addScaledVector(this.direction,J)}lookAt(J){return this.direction.copy(J).sub(this.origin).normalize(),this}recast(J){return this.origin.copy(this.at(J,V9)),this}closestPointToPoint(J,Q){Q.subVectors(J,this.origin);let $=Q.dot(this.direction);if($<0)return Q.copy(this.origin);return Q.copy(this.origin).addScaledVector(this.direction,$)}distanceToPoint(J){return Math.sqrt(this.distanceSqToPoint(J))}distanceSqToPoint(J){let Q=V9.subVectors(J,this.origin).dot(this.direction);if(Q<0)return this.origin.distanceToSquared(J);return V9.copy(this.origin).addScaledVector(this.direction,Q),V9.distanceToSquared(J)}distanceSqToSegment(J,Q,$,W){T6.copy(J).add(Q).multiplyScalar(0.5),M7.copy(Q).sub(J).normalize(),L7.copy(this.origin).sub(T6);let Z=J.distanceTo(Q)*0.5,K=-this.direction.dot(M7),Y=L7.dot(this.direction),X=-L7.dot(M7),H=L7.lengthSq(),U=Math.abs(1-K*K),N,E,G,D;if(U>0)if(N=K*X-Y,E=K*Y-X,D=Z*U,N>=0)if(E>=-D)if(E<=D){let M=1/U;N*=M,E*=M,G=N*(N+K*E+2*Y)+E*(K*N+E+2*X)+H}else E=Z,N=Math.max(0,-(K*E+Y)),G=-N*N+E*(E+2*X)+H;else E=-Z,N=Math.max(0,-(K*E+Y)),G=-N*N+E*(E+2*X)+H;else if(E<=-D)N=Math.max(0,-(-K*Z+Y)),E=N>0?-Z:Math.min(Math.max(-Z,-X),Z),G=-N*N+E*(E+2*X)+H;else if(E<=D)N=0,E=Math.min(Math.max(-Z,-X),Z),G=E*(E+2*X)+H;else N=Math.max(0,-(K*Z+Y)),E=N>0?Z:Math.min(Math.max(-Z,-X),Z),G=-N*N+E*(E+2*X)+H;else E=K>0?-Z:Z,N=Math.max(0,-(K*E+Y)),G=-N*N+E*(E+2*X)+H;if($)$.copy(this.origin).addScaledVector(this.direction,N);if(W)W.copy(T6).addScaledVector(M7,E);return G}intersectSphere(J,Q){if(J.radius<0)return null;V9.subVectors(J.center,this.origin);let $=V9.dot(this.direction),W=V9.dot(V9)-$*$,Z=J.radius*J.radius;if(W>Z)return null;let K=Math.sqrt(Z-W),Y=$-K,X=$+K;if(X<0)return null;if(Y<0)return this.at(X,Q);return this.at(Y,Q)}intersectsSphere(J){if(J.radius<0)return!1;return this.distanceSqToPoint(J.center)<=J.radius*J.radius}distanceToPlane(J){let Q=J.normal.dot(this.direction);if(Q===0){if(J.distanceToPoint(this.origin)===0)return 0;return null}let $=-(this.origin.dot(J.normal)+J.constant)/Q;return $>=0?$:null}intersectPlane(J,Q){let $=this.distanceToPlane(J);if($===null)return null;return this.at($,Q)}intersectsPlane(J){let Q=J.distanceToPoint(this.origin);if(Q===0)return!0;if(J.normal.dot(this.direction)*Q<0)return!0;return!1}intersectBox(J,Q){let $,W,Z,K,Y,X,H=1/this.direction.x,U=1/this.direction.y,N=1/this.direction.z,E=this.origin;if(H>=0)$=(J.min.x-E.x)*H,W=(J.max.x-E.x)*H;else $=(J.max.x-E.x)*H,W=(J.min.x-E.x)*H;if(U>=0)Z=(J.min.y-E.y)*U,K=(J.max.y-E.y)*U;else Z=(J.max.y-E.y)*U,K=(J.min.y-E.y)*U;if($>K||Z>W)return null;if(Z>$||isNaN($))$=Z;if(K<W||isNaN(W))W=K;if(N>=0)Y=(J.min.z-E.z)*N,X=(J.max.z-E.z)*N;else Y=(J.max.z-E.z)*N,X=(J.min.z-E.z)*N;if($>X||Y>W)return null;if(Y>$||$!==$)$=Y;if(X<W||W!==W)W=X;if(W<0)return null;return this.at($>=0?$:W,Q)}intersectsBox(J){return this.intersectBox(J,V9)!==null}intersectTriangle(J,Q,$,W,Z){let K=this.origin,Y=this.direction,X=Y.x,H=Y.y,U=Y.z,N=J.x-K.x,E=J.y-K.y,G=J.z-K.z,D=Q.x-K.x,M=Q.y-K.y,I=Q.z-K.z,F=$.x-K.x,q=$.y-K.y,A=$.z-K.z,j=Math.abs(X),V=Math.abs(H),z=Math.abs(U),P,C,k,B,g,f,h,a,_,d,o,p;if(j>=V&&j>=z)if(k=X,f=N,_=D,p=F,X>=0)P=H,C=U,B=E,g=G,h=M,a=I,d=q,o=A;else P=U,C=H,B=G,g=E,h=I,a=M,d=A,o=q;else if(V>=z)if(k=H,f=E,_=M,p=q,H>=0)P=U,C=X,B=G,g=N,h=I,a=D,d=A,o=F;else P=X,C=U,B=N,g=G,h=D,a=I,d=F,o=A;else if(k=U,f=G,_=I,p=A,U>=0)P=X,C=H,B=N,g=E,h=D,a=M,d=F,o=q;else P=H,C=X,B=E,g=N,h=M,a=D,d=q,o=F;if(k===0)return null;let Q0=P/k,c=C/k,r=1/k,J0=B-Q0*f,_0=g-c*f,z0=h-Q0*_,WJ=a-c*_,b0=d-Q0*p,n=o-c*p,$0=b0*WJ-n*z0,Z0=J0*n-_0*b0,A0=z0*_0-WJ*J0;if(W){if($0<0||Z0<0||A0<0)return null}else if(($0<0||Z0<0||A0<0)&&($0>0||Z0>0||A0>0))return null;let T0=$0+Z0+A0;if(T0===0)return null;let B0=r*($0*f+Z0*_+A0*p);if(T0>0?B0<0:B0>0)return null;return this.at(B0/T0,Z)}applyMatrix4(J){return this.origin.applyMatrix4(J),this.direction.transformDirection(J),this}equals(J){return J.origin.equals(this.origin)&&J.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class v8 extends y8{constructor(J){super();this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new C0(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new y9,this.combine=0,this.reflectivity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.fog=J.fog,this}}var t$=new YJ,c9=new f8,V7=new Z7,e$=new v,B7=new v,I7=new v,z7=new v,S6=new v,A7=new v,JW=new v,P7=new v;class BJ extends _J{constructor(J=new gJ,Q=new v8){super();this.isMesh=!0,this.type="Mesh",this.geometry=J,this.material=Q,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(J,Q){if(super.copy(J,Q),J.morphTargetInfluences!==void 0)this.morphTargetInfluences=J.morphTargetInfluences.slice();if(J.morphTargetDictionary!==void 0)this.morphTargetDictionary=Object.assign({},J.morphTargetDictionary);return this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}updateMorphTargets(){let Q=this.geometry.morphAttributes,$=Object.keys(Q);if($.length>0){let W=Q[$[0]];if(W!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let Z=0,K=W.length;Z<K;Z++){let Y=W[Z].name||String(Z);this.morphTargetInfluences.push(0),this.morphTargetDictionary[Y]=Z}}}}getVertexPosition(J,Q){let $=this.geometry,W=$.attributes.position,Z=$.morphAttributes.position,K=$.morphTargetsRelative;Q.fromBufferAttribute(W,J);let Y=this.morphTargetInfluences;if(Z&&Y){A7.set(0,0,0);for(let X=0,H=Z.length;X<H;X++){let U=Y[X],N=Z[X];if(U===0)continue;if(S6.fromBufferAttribute(N,J),K)A7.addScaledVector(S6,U);else A7.addScaledVector(S6.sub(Q),U)}Q.add(A7)}return Q}intersectsFrustum(J){return J.intersectsObject(this)}raycast(J,Q){let $=this.geometry,W=this.material,Z=this.matrixWorld;if(W===void 0)return;if($.boundingSphere===null)$.computeBoundingSphere();if(V7.copy($.boundingSphere),V7.applyMatrix4(Z),c9.copy(J.ray).recast(J.near),V7.containsPoint(c9.origin)===!1){if(c9.intersectSphere(V7,e$)===null)return;if(c9.origin.distanceToSquared(e$)>(J.far-J.near)**2)return}if(t$.copy(Z).invert(),c9.copy(J.ray).applyMatrix4(t$),$.boundingBox!==null){if(c9.intersectsBox($.boundingBox)===!1)return}this._computeIntersections(J,Q,c9)}_computeIntersections(J,Q,$){let W,Z=this.geometry,K=this.material,Y=Z.index,X=Z.attributes.position,H=Z.attributes.uv,U=Z.attributes.uv1,N=Z.attributes.normal,E=Z.groups,G=Z.drawRange;if(Y!==null)if(Array.isArray(K))for(let D=0,M=E.length;D<M;D++){let I=E[D],F=K[I.materialIndex],q=Math.max(I.start,G.start),A=Math.min(Y.count,Math.min(I.start+I.count,G.start+G.count));for(let j=q,V=A;j<V;j+=3){let z=Y.getX(j),P=Y.getX(j+1),C=Y.getX(j+2);if(W=C7(this,F,J,$,H,U,N,z,P,C),W)W.faceIndex=Math.floor(j/3),W.face.materialIndex=I.materialIndex,Q.push(W)}}else{let D=Math.max(0,G.start),M=Math.min(Y.count,G.start+G.count);for(let I=D,F=M;I<F;I+=3){let q=Y.getX(I),A=Y.getX(I+1),j=Y.getX(I+2);if(W=C7(this,K,J,$,H,U,N,q,A,j),W)W.faceIndex=Math.floor(I/3),Q.push(W)}}else if(X!==void 0)if(Array.isArray(K))for(let D=0,M=E.length;D<M;D++){let I=E[D],F=K[I.materialIndex],q=Math.max(I.start,G.start),A=Math.min(X.count,Math.min(I.start+I.count,G.start+G.count));for(let j=q,V=A;j<V;j+=3){let z=j,P=j+1,C=j+2;if(W=C7(this,F,J,$,H,U,N,z,P,C),W)W.faceIndex=Math.floor(j/3),W.face.materialIndex=I.materialIndex,Q.push(W)}}else{let D=Math.max(0,G.start),M=Math.min(X.count,G.start+G.count);for(let I=D,F=M;I<F;I+=3){let q=I,A=I+1,j=I+2;if(W=C7(this,K,J,$,H,U,N,q,A,j),W)W.faceIndex=Math.floor(I/3),Q.push(W)}}}}function XY(J,Q,$,W,Z,K,Y,X){let H;if(Q.side===1)H=W.intersectTriangle(Y,K,Z,!0,X);else H=W.intersectTriangle(Z,K,Y,Q.side===0,X);if(H===null)return null;P7.copy(X),P7.applyMatrix4(J.matrixWorld);let U=$.ray.origin.distanceTo(P7);if(U<$.near||U>$.far)return null;return{distance:U,point:P7.clone(),object:J}}function C7(J,Q,$,W,Z,K,Y,X,H,U){J.getVertexPosition(X,B7),J.getVertexPosition(H,I7),J.getVertexPosition(U,z7);let N=XY(J,Q,$,W,B7,I7,z7,JW);if(N){let E=new v;if(oJ.getBarycoord(JW,B7,I7,z7,E),Z)N.uv=oJ.getInterpolatedAttribute(Z,X,H,U,E,new j0);if(K)N.uv1=oJ.getInterpolatedAttribute(K,X,H,U,E,new j0);if(Y){if(N.normal=oJ.getInterpolatedAttribute(Y,X,H,U,E,new v),N.normal.dot(W.direction)>0)N.normal.multiplyScalar(-1)}let G={a:X,b:H,c:U,normal:new v,materialIndex:0};oJ.getNormal(B7,I7,z7,G.normal),N.face=G,N.barycoord=E}return N}class gQ extends wJ{constructor(J=null,Q=1,$=1,W,Z,K,Y,X,H=1003,U=1003,N,E){super(null,K,Y,X,H,U,W,Z,N,E);this.isDataTexture=!0,this.image={data:J,width:Q,height:$},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}var n9=new Z7,HY=new j0(0.5,0.5),w7=new v;class s7{constructor(J=new iJ,Q=new iJ,$=new iJ,W=new iJ,Z=new iJ,K=new iJ){this.planes=[J,Q,$,W,Z,K]}set(J,Q,$,W,Z,K){let Y=this.planes;return Y[0].copy(J),Y[1].copy(Q),Y[2].copy($),Y[3].copy(W),Y[4].copy(Z),Y[5].copy(K),this}copy(J){let Q=this.planes;for(let $=0;$<6;$++)Q[$].copy(J.planes[$]);return this}setFromProjectionMatrix(J,Q=2000,$=!1){let W=this.planes,Z=J.elements,K=Z[0],Y=Z[1],X=Z[2],H=Z[3],U=Z[4],N=Z[5],E=Z[6],G=Z[7],D=Z[8],M=Z[9],I=Z[10],F=Z[11],q=Z[12],A=Z[13],j=Z[14],V=Z[15];if(W[0].setComponents(H-K,G-U,F-D,V-q).normalize(),W[1].setComponents(H+K,G+U,F+D,V+q).normalize(),W[2].setComponents(H+Y,G+N,F+M,V+A).normalize(),W[3].setComponents(H-Y,G-N,F-M,V-A).normalize(),$)W[4].setComponents(X,E,I,j).normalize(),W[5].setComponents(H-X,G-E,F-I,V-j).normalize();else if(W[4].setComponents(H-X,G-E,F-I,V-j).normalize(),Q===2000)W[5].setComponents(H+X,G+E,F+I,V+j).normalize();else if(Q===2001)W[5].setComponents(X,E,I,j).normalize();else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+Q);return this}intersectsObject(J){if(J.boundingSphere!==void 0){if(J.boundingSphere===null)J.computeBoundingSphere();n9.copy(J.boundingSphere).applyMatrix4(J.matrixWorld)}else{let Q=J.geometry;if(Q.boundingSphere===null)Q.computeBoundingSphere();n9.copy(Q.boundingSphere).applyMatrix4(J.matrixWorld)}return this.intersectsSphere(n9)}intersectsSprite(J){n9.center.set(0,0,0);let Q=HY.distanceTo(J.center);return n9.radius=0.7071067811865476+Q,n9.applyMatrix4(J.matrixWorld),this.intersectsSphere(n9)}intersectsSphere(J){let Q=this.planes,$=J.center,W=-J.radius;for(let Z=0;Z<6;Z++)if(Q[Z].distanceToPoint($)<W)return!1;return!0}intersectsBox(J){let Q=this.planes;for(let $=0;$<6;$++){let W=Q[$];if(w7.x=W.normal.x>0?J.max.x:J.min.x,w7.y=W.normal.y>0?J.max.y:J.min.y,w7.z=W.normal.z>0?J.max.z:J.min.z,W.distanceToPoint(w7)<0)return!1}return!0}containsPoint(J){let Q=this.planes;for(let $=0;$<6;$++)if(Q[$].distanceToPoint(J)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class i7 extends wJ{constructor(J=[],Q=301,$,W,Z,K,Y,X,H,U){super(J,Q,$,W,Z,K,Y,X,H,U);this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(J){this.image=J}}class J8 extends wJ{constructor(J,Q,$=1014,W,Z,K,Y=1003,X=1003,H,U=1026,N=1){if(U!==1026&&U!==1027)throw Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let E={width:J,height:Q,depth:N};super(E,W,Z,K,Y,X,U,$,H);this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(J){return super.copy(J),this.source=new Q7(Object.assign({},J.image)),this.compareFunction=J.compareFunction,this}toJSON(J){let Q=super.toJSON(J);return Q.compareFunction=this.compareFunction,Q}}class pQ extends J8{constructor(J,Q=1014,$=301,W,Z,K=1003,Y=1003,X,H=1026){let U={width:J,height:J,depth:1},N=[U,U,U,U,U,U];super(J,J,Q,$,W,Z,K,Y,X,H);this.image=N,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(J){this.image=J}}class o7 extends wJ{constructor(J=null){super();this.sourceTexture=J,this.isExternalTexture=!0}copy(J){return super.copy(J),this.sourceTexture=J.sourceTexture,this}}class x9 extends gJ{constructor(J=1,Q=1,$=1,W=1,Z=1,K=1){super();this.type="BoxGeometry",this.parameters={width:J,height:Q,depth:$,widthSegments:W,heightSegments:Z,depthSegments:K};let Y=this;W=Math.floor(W),Z=Math.floor(Z),K=Math.floor(K);let X=[],H=[],U=[],N=[],E=0,G=0;D("z","y","x",-1,-1,$,Q,J,K,Z,0),D("z","y","x",1,-1,$,Q,-J,K,Z,1),D("x","z","y",1,1,J,$,Q,W,K,2),D("x","z","y",1,-1,J,$,-Q,W,K,3),D("x","y","z",1,-1,J,Q,$,W,Z,4),D("x","y","z",-1,-1,J,Q,-$,W,Z,5),this.setIndex(X),this.setAttribute("position",new t0(H,3)),this.setAttribute("normal",new t0(U,3)),this.setAttribute("uv",new t0(N,2));function D(M,I,F,q,A,j,V,z,P,C,k){let B=j/P,g=V/C,f=j/2,h=V/2,a=z/2,_=P+1,d=C+1,o=0,p=0,Q0=new v;for(let c=0;c<d;c++){let r=c*g-h;for(let J0=0;J0<_;J0++){let _0=J0*B-f;Q0[M]=_0*q,Q0[I]=r*A,Q0[F]=a,H.push(Q0.x,Q0.y,Q0.z),Q0[M]=0,Q0[I]=0,Q0[F]=z>0?1:-1,U.push(Q0.x,Q0.y,Q0.z),N.push(J0/P),N.push(1-c/C),o+=1}}for(let c=0;c<C;c++)for(let r=0;r<P;r++){let J0=E+r+_*c,_0=E+r+_*(c+1),z0=E+(r+1)+_*(c+1),WJ=E+(r+1)+_*c;X.push(J0,_0,WJ),X.push(_0,z0,WJ),p+=6}Y.addGroup(G,p,k),G+=p,E+=o}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new x9(J.width,J.height,J.depth,J.widthSegments,J.heightSegments,J.depthSegments)}}class Q8 extends gJ{constructor(J=1,Q=1,$=1,W=1){super();this.type="PlaneGeometry",this.parameters={width:J,height:Q,widthSegments:$,heightSegments:W};let Z=J/2,K=Q/2,Y=Math.floor($),X=Math.floor(W),H=Y+1,U=X+1,N=J/Y,E=Q/X,G=[],D=[],M=[],I=[];for(let F=0;F<U;F++){let q=F*E-K;for(let A=0;A<H;A++){let j=A*N-Z;D.push(j,-q,0),M.push(0,0,1),I.push(A/Y),I.push(1-F/X)}}for(let F=0;F<X;F++)for(let q=0;q<Y;q++){let A=q+H*F,j=q+H*(F+1),V=q+1+H*(F+1),z=q+1+H*F;G.push(A,j,z),G.push(j,V,z)}this.setIndex(G),this.setAttribute("position",new t0(D,3)),this.setAttribute("normal",new t0(M,3)),this.setAttribute("uv",new t0(I,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new Q8(J.width,J.height,J.widthSegments,J.heightSegments)}}function $8(J){let Q={};for(let $ in J){Q[$]={};for(let W in J[$]){let Z=J[$][W];if(QW(Z))if(Z.isRenderTargetTexture)w0("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),Q[$][W]=null;else Q[$][W]=Z.clone();else if(Array.isArray(Z))if(QW(Z[0])){let K=[];for(let Y=0,X=Z.length;Y<X;Y++)K[Y]=Z[Y].clone();Q[$][W]=K}else Q[$][W]=Z.slice();else Q[$][W]=Z}}return Q}function TJ(J){let Q={};for(let $=0;$<J.length;$++){let W=$8(J[$]);for(let Z in W)Q[Z]=W[Z]}return Q}function QW(J){return J&&(J.isColor||J.isMatrix3||J.isMatrix4||J.isVector2||J.isVector3||J.isVector4||J.isTexture||J.isQuaternion)}function UY(J){let Q=[];for(let $=0;$<J.length;$++)Q.push(J[$].clone());return Q}function mQ(J){let Q=J.getRenderTarget();if(Q===null)return J.outputColorSpace;if(Q.isXRRenderTarget===!0)return Q.texture.colorSpace;return m0.workingColorSpace}var GZ={clone:$8,merge:TJ},GY=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,NY=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class zJ extends y8{constructor(J){super();if(this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=GY,this.fragmentShader=NY,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,J!==void 0)this.setValues(J)}copy(J){return super.copy(J),this.fragmentShader=J.fragmentShader,this.vertexShader=J.vertexShader,this.uniforms=$8(J.uniforms),this.uniformsGroups=UY(J.uniformsGroups),this.defines=Object.assign({},J.defines),this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.fog=J.fog,this.lights=J.lights,this.clipping=J.clipping,this.extensions=Object.assign({},J.extensions),this.glslVersion=J.glslVersion,this.defaultAttributeValues=Object.assign({},J.defaultAttributeValues),this.index0AttributeName=J.index0AttributeName,this.uniformsNeedUpdate=J.uniformsNeedUpdate,this}toJSON(J){let Q=super.toJSON(J);Q.glslVersion=this.glslVersion,Q.uniforms={};for(let W in this.uniforms){let K=this.uniforms[W].value;if(K&&K.isTexture)Q.uniforms[W]={type:"t",value:K.toJSON(J).uuid};else if(K&&K.isColor)Q.uniforms[W]={type:"c",value:K.getHex()};else if(K&&K.isVector2)Q.uniforms[W]={type:"v2",value:K.toArray()};else if(K&&K.isVector3)Q.uniforms[W]={type:"v3",value:K.toArray()};else if(K&&K.isVector4)Q.uniforms[W]={type:"v4",value:K.toArray()};else if(K&&K.isMatrix3)Q.uniforms[W]={type:"m3",value:K.toArray()};else if(K&&K.isMatrix4)Q.uniforms[W]={type:"m4",value:K.toArray()};else Q.uniforms[W]={value:K}}if(Object.keys(this.defines).length>0)Q.defines=this.defines;Q.vertexShader=this.vertexShader,Q.fragmentShader=this.fragmentShader,Q.lights=this.lights,Q.clipping=this.clipping;let $={};for(let W in this.extensions)if(this.extensions[W]===!0)$[W]=!0;if(Object.keys($).length>0)Q.extensions=$;return Q}fromJSON(J,Q){if(super.fromJSON(J,Q),J.uniforms!==void 0)for(let $ in J.uniforms){let W=J.uniforms[$];switch(this.uniforms[$]={},W.type){case"t":this.uniforms[$].value=Q[W.value]||null;break;case"c":this.uniforms[$].value=new C0().setHex(W.value);break;case"v2":this.uniforms[$].value=new j0().fromArray(W.value);break;case"v3":this.uniforms[$].value=new v().fromArray(W.value);break;case"v4":this.uniforms[$].value=new GJ().fromArray(W.value);break;case"m3":this.uniforms[$].value=new y0().fromArray(W.value);break;case"m4":this.uniforms[$].value=new YJ().fromArray(W.value);break;default:this.uniforms[$].value=W.value}}if(J.defines!==void 0)this.defines=J.defines;if(J.vertexShader!==void 0)this.vertexShader=J.vertexShader;if(J.fragmentShader!==void 0)this.fragmentShader=J.fragmentShader;if(J.glslVersion!==void 0)this.glslVersion=J.glslVersion;if(J.extensions!==void 0)for(let $ in J.extensions)this.extensions[$]=J.extensions[$];if(J.lights!==void 0)this.lights=J.lights;if(J.clipping!==void 0)this.clipping=J.clipping;return this}}class lQ extends zJ{constructor(J){super(J);this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class dQ extends y8{constructor(J){super();this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(J)}copy(J){return super.copy(J),this.depthPacking=J.depthPacking,this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this}}class uQ extends y8{constructor(J){super();this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(J)}copy(J){return super.copy(J),this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this}}function M8(J,Q){if(!J||J.constructor===Q)return J;if(typeof Q.BYTES_PER_ELEMENT==="number")return new Q(J);return Array.prototype.slice.call(J)}function j6(J){return J!==void 0&&J.inTangents!==void 0&&J.outTangents!==void 0}class W8{constructor(J,Q,$,W){this.parameterPositions=J,this._cachedIndex=0,this.resultBuffer=W!==void 0?W:new Q.constructor($),this.sampleValues=Q,this.valueSize=$,this.settings=null,this.DefaultSettings_={}}evaluate(J){let Q=this.parameterPositions,$=this._cachedIndex,W=Q[$],Z=Q[$-1];$:{J:{let K;Q:{W:if(!(J<W)){for(let Y=$+2;;){if(W===void 0){if(J<Z)break W;return $=Q.length,this._cachedIndex=$,this.copySampleValue_($-1)}if($===Y)break;if(Z=W,W=Q[++$],J<W)break J}K=Q.length;break Q}if(!(J>=Z)){let Y=Q[1];if(J<Y)$=2,Z=Y;for(let X=$-2;;){if(Z===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if($===X)break;if(W=Z,Z=Q[--$-1],J>=Z)break J}K=$,$=0;break Q}break $}while($<K){let Y=$+K>>>1;if(J<Q[Y])K=Y;else $=Y+1}if(W=Q[$],Z=Q[$-1],Z===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(W===void 0)return $=Q.length,this._cachedIndex=$,this.copySampleValue_($-1)}this._cachedIndex=$,this.intervalChanged_($,Z,W)}return this.interpolate_($,Z,J,W)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(J){let Q=this.resultBuffer,$=this.sampleValues,W=this.valueSize,Z=J*W;for(let K=0;K!==W;++K)Q[K]=$[Z+K];return Q}interpolate_(){throw Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}}class cQ extends W8{constructor(J,Q,$,W){super(J,Q,$,W);this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:2400,endingEnd:2400}}intervalChanged_(J,Q,$){let W=this.parameterPositions,Z=J-2,K=J+1,Y=W[Z],X=W[K];if(Y===void 0)switch(this.getSettings_().endingStart){case 2401:Z=J,Y=2*Q-$;break;case 2402:Z=W.length-2,Y=Q+W[Z]-W[Z+1];break;default:Z=J,Y=$}if(X===void 0)switch(this.getSettings_().endingEnd){case 2401:K=J,X=2*$-Q;break;case 2402:K=1,X=$+W[1]-W[0];break;default:K=J-1,X=Q}let H=($-Q)*0.5,U=this.valueSize;this._weightPrev=H/(Q-Y),this._weightNext=H/(X-$),this._offsetPrev=Z*U,this._offsetNext=K*U}interpolate_(J,Q,$,W){let Z=this.resultBuffer,K=this.sampleValues,Y=this.valueSize,X=J*Y,H=X-Y,U=this._offsetPrev,N=this._offsetNext,E=this._weightPrev,G=this._weightNext,D=($-Q)/(W-Q),M=D*D,I=M*D,F=-E*I+2*E*M-E*D,q=(1+E)*I+(-1.5-2*E)*M+(-0.5+E)*D+1,A=(-1-G)*I+(1.5+G)*M+0.5*D,j=G*I-G*M;for(let V=0;V!==Y;++V)Z[V]=F*K[U+V]+q*K[H+V]+A*K[X+V]+j*K[N+V];return Z}}class nQ extends W8{constructor(J,Q,$,W){super(J,Q,$,W)}interpolate_(J,Q,$,W){let Z=this.resultBuffer,K=this.sampleValues,Y=this.valueSize,X=J*Y,H=X-Y,U=($-Q)/(W-Q),N=1-U;for(let E=0;E!==Y;++E)Z[E]=K[H+E]*N+K[X+E]*U;return Z}}class sQ extends W8{constructor(J,Q,$,W){super(J,Q,$,W)}interpolate_(J){return this.copySampleValue_(J-1)}}class iQ extends W8{interpolate_(J,Q,$,W){let Z=this.resultBuffer,K=this.sampleValues,Y=this.valueSize,X=J*Y,H=X-Y,U=this.inTangents,N=this.outTangents;if(!U||!N){let D=($-Q)/(W-Q),M=1-D;for(let I=0;I!==Y;++I)Z[I]=K[H+I]*M+K[X+I]*D;return Z}let E=Y*2,G=J-1;for(let D=0;D!==Y;++D){let M=K[H+D],I=K[X+D],F=G*E+D*2,q=N[F],A=N[F+1],j=J*E+D*2,V=U[j],z=U[j+1],P=FY($,Q,q,V,W);Z[D]=NZ(P,M,A,z,I)}return Z}}function NZ(J,Q,$,W,Z){let K=1-J;return K*K*K*Q+3*K*K*J*$+3*K*J*J*W+J*J*J*Z}function qY(J,Q,$,W,Z){let K=1-J;return 3*K*K*($-Q)+6*K*J*(W-$)+3*J*J*(Z-W)}function FY(J,Q,$,W,Z){let K=(J-Q)/(Z-Q);for(let Y=0;Y<8;Y++){let X=NZ(K,Q,$,W,Z)-J;if(Math.abs(X)<0.0000000001)break;let H=qY(K,Q,$,W,Z);if(Math.abs(H)<0.0000000001)break;K=Math.max(0,Math.min(1,K-X/H))}return K}class rJ{constructor(J,Q,$,W){if(J===void 0)throw Error("THREE.KeyframeTrack: track name is undefined");if(Q===void 0||Q.length===0)throw Error("THREE.KeyframeTrack: no keyframes in track named "+J);this.name=J,this.times=M8(Q,this.TimeBufferType),this.values=M8($,this.ValueBufferType),this.setInterpolation(W||this.DefaultInterpolation)}static toJSON(J){let Q=J.constructor,$;if(Q.toJSON!==this.toJSON)$=Q.toJSON(J);else{$={name:J.name,times:M8(J.times,Array),values:M8(J.values,Array)};let W=J.getInterpolation();if(W!==J.DefaultInterpolation)$.interpolation=W;if(j6(J.settings))$.settings={inTangents:M8(J.settings.inTangents,Array),outTangents:M8(J.settings.outTangents,Array)}}return $.type=J.ValueTypeName,$}InterpolantFactoryMethodDiscrete(J){return new sQ(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodLinear(J){return new nQ(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodSmooth(J){return new cQ(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodBezier(J){let Q=new iQ(this.times,this.values,this.getValueSize(),J);if(this.settings)Q.inTangents=this.settings.inTangents,Q.outTangents=this.settings.outTangents;return Q}setInterpolation(J){let Q;switch(J){case 2300:Q=this.InterpolantFactoryMethodDiscrete;break;case 2301:Q=this.InterpolantFactoryMethodLinear;break;case 2302:Q=this.InterpolantFactoryMethodSmooth;break;case 2303:Q=this.InterpolantFactoryMethodBezier;break}if(Q===void 0){let $="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(J!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error($);return w0("KeyframeTrack:",$),this}return this.createInterpolant=Q,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302;case this.InterpolantFactoryMethodBezier:return 2303}}getValueSize(){return this.values.length/this.times.length}shift(J){if(J!==0){let Q=this.times;for(let $=0,W=Q.length;$!==W;++$)Q[$]+=J}return this}scale(J){if(J!==1){let Q=this.times;for(let $=0,W=Q.length;$!==W;++$)Q[$]*=J;if(j6(this.settings))$W(this.settings.inTangents,J),$W(this.settings.outTangents,J)}return this}trim(J,Q){let $=this.times,W=$.length,Z=0,K=W-1;while(Z!==W&&$[Z]<J)++Z;while(K!==-1&&$[K]>Q)--K;if(++K,Z!==0||K!==W){if(Z>=K)K=Math.max(K,1),Z=K-1;let Y=this.getValueSize();this.times=$.slice(Z,K),this.values=this.values.slice(Z*Y,K*Y)}return this}validate(){let J=!0,Q=this.getValueSize();if(Q-Math.floor(Q)!==0)S0("KeyframeTrack: Invalid value size in track.",this),J=!1;let $=this.times,W=this.values,Z=$.length;if(Z===0)S0("KeyframeTrack: Track is empty.",this),J=!1;let K=null;for(let Y=0;Y!==Z;Y++){let X=$[Y];if(typeof X==="number"&&isNaN(X)){S0("KeyframeTrack: Time is not a valid number.",this,Y,X),J=!1;break}if(K!==null&&K>X){S0("KeyframeTrack: Out of order keys.",this,Y,X,K),J=!1;break}K=X}if(W!==void 0){if(wK(W))for(let Y=0,X=W.length;Y!==X;++Y){let H=W[Y];if(isNaN(H)){S0("KeyframeTrack: Value is not a valid number.",this,Y,H),J=!1;break}}}return J}optimize(){let J=this.times.slice(),Q=this.values.slice(),$=this.getValueSize(),W=this.getInterpolation()===2302,Z=J.length-1,K=1;for(let Y=1;Y<Z;++Y){let X=!1,H=J[Y],U=J[Y+1];if(H!==U&&(Y!==1||H!==J[0]))if(!W){let N=Y*$,E=N-$,G=N+$;for(let D=0;D!==$;++D){let M=Q[N+D];if(M!==Q[E+D]||M!==Q[G+D]){X=!0;break}}}else X=!0;if(X){if(Y!==K){J[K]=J[Y];let N=Y*$,E=K*$;for(let G=0;G!==$;++G)Q[E+G]=Q[N+G]}++K}}if(Z>0){J[K]=J[Z];for(let Y=Z*$,X=K*$,H=0;H!==$;++H)Q[X+H]=Q[Y+H];++K}if(K!==J.length)this.times=J.slice(0,K),this.values=Q.slice(0,K*$);else this.times=J,this.values=Q;return this}clone(){let J=this.times.slice(),Q=this.values.slice(),W=new this.constructor(this.name,J,Q);if(W.createInterpolant=this.createInterpolant,j6(this.settings))W.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()};return W}}function $W(J,Q){for(let $=0,W=J.length;$!==W;$+=2)J[$]*=Q}rJ.prototype.ValueTypeName="";rJ.prototype.TimeBufferType=Float32Array;rJ.prototype.ValueBufferType=Float32Array;rJ.prototype.DefaultInterpolation=2301;class Z8 extends rJ{constructor(J,Q,$){super(J,Q,$)}}Z8.prototype.ValueTypeName="bool";Z8.prototype.ValueBufferType=Array;Z8.prototype.DefaultInterpolation=2300;Z8.prototype.InterpolantFactoryMethodLinear=void 0;Z8.prototype.InterpolantFactoryMethodSmooth=void 0;class oQ extends rJ{constructor(J,Q,$,W){super(J,Q,$,W)}}oQ.prototype.ValueTypeName="color";class aQ extends rJ{constructor(J,Q,$,W){super(J,Q,$,W)}}aQ.prototype.ValueTypeName="number";class rQ extends W8{constructor(J,Q,$,W){super(J,Q,$,W)}interpolate_(J,Q,$,W){let Z=this.resultBuffer,K=this.sampleValues,Y=this.valueSize,X=($-Q)/(W-Q),H=J*Y;for(let U=H+Y;H!==U;H+=4)aJ.slerpFlat(Z,0,K,H-Y,K,H,X);return Z}}class a7 extends rJ{constructor(J,Q,$,W){super(J,Q,$,W)}InterpolantFactoryMethodLinear(J){return new rQ(this.times,this.values,this.getValueSize(),J)}}a7.prototype.ValueTypeName="quaternion";a7.prototype.InterpolantFactoryMethodSmooth=void 0;class K8 extends rJ{constructor(J,Q,$){super(J,Q,$)}}K8.prototype.ValueTypeName="string";K8.prototype.ValueBufferType=Array;K8.prototype.DefaultInterpolation=2300;K8.prototype.InterpolantFactoryMethodLinear=void 0;K8.prototype.InterpolantFactoryMethodSmooth=void 0;class tQ extends rJ{constructor(J,Q,$,W){super(J,Q,$,W)}}tQ.prototype.ValueTypeName="vector";class eQ{constructor(J,Q,$){let W=this,Z=!1,K=0,Y=0,X=void 0,H=[];this.onStart=void 0,this.onLoad=J,this.onProgress=Q,this.onError=$,this._abortController=null,this.itemStart=function(U){if(Y++,Z===!1){if(W.onStart!==void 0)W.onStart(U,K,Y)}Z=!0},this.itemEnd=function(U){if(K++,W.onProgress!==void 0)W.onProgress(U,K,Y);if(K===Y){if(Z=!1,W.onLoad!==void 0)W.onLoad()}},this.itemError=function(U){if(W.onError!==void 0)W.onError(U)},this.resolveURL=function(U){if(U=U.normalize("NFC"),X)return X(U);return U},this.setURLModifier=function(U){return X=U,this},this.addHandler=function(U,N){return H.push(U,N),this},this.removeHandler=function(U){let N=H.indexOf(U);if(N!==-1)H.splice(N,2);return this},this.getHandler=function(U){for(let N=0,E=H.length;N<E;N+=2){let G=H[N],D=H[N+1];if(G.global)G.lastIndex=0;if(G.test(U))return D}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){if(!this._abortController)this._abortController=new AbortController;return this._abortController}}var qZ=new eQ;class J${constructor(J){if(this.manager=J!==void 0?J:qZ,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(J,Q){let $=this;return new Promise(function(W,Z){$.load(J,W,Q,Z)})}parse(){}setCrossOrigin(J){return this.crossOrigin=J,this}setWithCredentials(J){return this.withCredentials=J,this}setPath(J){return this.path=J,this}setResourcePath(J){return this.resourcePath=J,this}setRequestHeader(J){return this.requestHeader=J,this}abort(){return this}}J$.DEFAULT_MATERIAL_NAME="__DEFAULT";var _7=new v,T7=new aJ,H9=new v;class r7 extends _J{constructor(){super();this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new YJ,this.projectionMatrix=new YJ,this.projectionMatrixInverse=new YJ,this.coordinateSystem=2000,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(J,Q){return super.copy(J,Q),this.matrixWorldInverse.copy(J.matrixWorldInverse),this.projectionMatrix.copy(J.projectionMatrix),this.projectionMatrixInverse.copy(J.projectionMatrixInverse),this.coordinateSystem=J.coordinateSystem,this}getWorldDirection(J){return super.getWorldDirection(J).negate()}updateMatrixWorld(J){if(super.updateMatrixWorld(J),this.matrixWorld.decompose(_7,T7,H9),H9.x===1&&H9.y===1&&H9.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(_7,T7,H9.set(1,1,1)).invert()}updateWorldMatrix(J,Q,$=!1){if(super.updateWorldMatrix(J,Q,$),this.matrixWorld.decompose(_7,T7,H9),H9.x===1&&H9.y===1&&H9.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(_7,T7,H9.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}var j9=new v,WW=new j0,ZW=new j0;class dJ extends r7{constructor(J=50,Q=1,$=0.1,W=2000){super();this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=J,this.zoom=1,this.near=$,this.far=W,this.focus=10,this.aspect=Q,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(J,Q){return super.copy(J,Q),this.fov=J.fov,this.zoom=J.zoom,this.near=J.near,this.far=J.far,this.focus=J.focus,this.aspect=J.aspect,this.view=J.view===null?null:Object.assign({},J.view),this.filmGauge=J.filmGauge,this.filmOffset=J.filmOffset,this}setFocalLength(J){let Q=0.5*this.getFilmHeight()/J;this.fov=P8*2*Math.atan(Q),this.updateProjectionMatrix()}getFocalLength(){let J=Math.tan(s8*0.5*this.fov);return 0.5*this.getFilmHeight()/J}getEffectiveFOV(){return P8*2*Math.atan(Math.tan(s8*0.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(J,Q,$){j9.set(-1,-1,0.5).applyMatrix4(this.projectionMatrixInverse),Q.set(j9.x,j9.y).multiplyScalar(-J/j9.z),j9.set(1,1,0.5).applyMatrix4(this.projectionMatrixInverse),$.set(j9.x,j9.y).multiplyScalar(-J/j9.z)}getViewSize(J,Q){return this.getViewBounds(J,WW,ZW),Q.subVectors(ZW,WW)}setViewOffset(J,Q,$,W,Z,K){if(this.aspect=J/Q,this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=Q,this.view.offsetX=$,this.view.offsetY=W,this.view.width=Z,this.view.height=K,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=this.near,Q=J*Math.tan(s8*0.5*this.fov)/this.zoom,$=2*Q,W=this.aspect*$,Z=-0.5*W,K=this.view;if(this.view!==null&&this.view.enabled){let{fullWidth:X,fullHeight:H}=K;Z+=K.offsetX*W/X,Q-=K.offsetY*$/H,W*=K.width/X,$*=K.height/H}let Y=this.filmOffset;if(Y!==0)Z+=J*Y/this.getFilmWidth();this.projectionMatrix.makePerspective(Z,Z+W,Q,Q-$,J,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let Q=super.toJSON(J);if(Q.object.fov=this.fov,Q.object.zoom=this.zoom,Q.object.near=this.near,Q.object.far=this.far,Q.object.focus=this.focus,Q.object.aspect=this.aspect,this.view!==null)Q.object.view=Object.assign({},this.view);return Q.object.filmGauge=this.filmGauge,Q.object.filmOffset=this.filmOffset,Q}}class h8 extends r7{constructor(J=-1,Q=1,$=1,W=-1,Z=0.1,K=2000){super();this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=J,this.right=Q,this.top=$,this.bottom=W,this.near=Z,this.far=K,this.updateProjectionMatrix()}copy(J,Q){return super.copy(J,Q),this.left=J.left,this.right=J.right,this.top=J.top,this.bottom=J.bottom,this.near=J.near,this.far=J.far,this.zoom=J.zoom,this.view=J.view===null?null:Object.assign({},J.view),this}setViewOffset(J,Q,$,W,Z,K){if(this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=Q,this.view.offsetX=$,this.view.offsetY=W,this.view.width=Z,this.view.height=K,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=(this.right-this.left)/(2*this.zoom),Q=(this.top-this.bottom)/(2*this.zoom),$=(this.right+this.left)/2,W=(this.top+this.bottom)/2,Z=$-J,K=$+J,Y=W+Q,X=W-Q;if(this.view!==null&&this.view.enabled){let H=(this.right-this.left)/this.view.fullWidth/this.zoom,U=(this.top-this.bottom)/this.view.fullHeight/this.zoom;Z+=H*this.view.offsetX,K=Z+H*this.view.width,Y-=U*this.view.offsetY,X=Y-U*this.view.height}this.projectionMatrix.makeOrthographic(Z,K,Y,X,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let Q=super.toJSON(J);if(Q.object.zoom=this.zoom,Q.object.left=this.left,Q.object.right=this.right,Q.object.top=this.top,Q.object.bottom=this.bottom,Q.object.near=this.near,Q.object.far=this.far,this.view!==null)Q.object.view=Object.assign({},this.view);return Q}}var L8=-90,V8=1;class Q$ extends _J{constructor(J,Q,$){super();this.type="CubeCamera",this.renderTarget=$,this.coordinateSystem=null,this.activeMipmapLevel=0;let W=new dJ(L8,V8,J,Q);W.layers=this.layers,this.add(W);let Z=new dJ(L8,V8,J,Q);Z.layers=this.layers,this.add(Z);let K=new dJ(L8,V8,J,Q);K.layers=this.layers,this.add(K);let Y=new dJ(L8,V8,J,Q);Y.layers=this.layers,this.add(Y);let X=new dJ(L8,V8,J,Q);X.layers=this.layers,this.add(X);let H=new dJ(L8,V8,J,Q);H.layers=this.layers,this.add(H)}updateCoordinateSystem(){let J=this.coordinateSystem,Q=this.children.concat(),[$,W,Z,K,Y,X]=Q;for(let H of Q)this.remove(H);if(J===2000)$.up.set(0,1,0),$.lookAt(1,0,0),W.up.set(0,1,0),W.lookAt(-1,0,0),Z.up.set(0,0,-1),Z.lookAt(0,1,0),K.up.set(0,0,1),K.lookAt(0,-1,0),Y.up.set(0,1,0),Y.lookAt(0,0,1),X.up.set(0,1,0),X.lookAt(0,0,-1);else if(J===2001)$.up.set(0,-1,0),$.lookAt(-1,0,0),W.up.set(0,-1,0),W.lookAt(1,0,0),Z.up.set(0,0,1),Z.lookAt(0,1,0),K.up.set(0,0,-1),K.lookAt(0,-1,0),Y.up.set(0,-1,0),Y.lookAt(0,0,1),X.up.set(0,-1,0),X.lookAt(0,0,-1);else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+J);for(let H of Q)this.add(H),H.updateMatrixWorld()}update(J,Q){if(this.parent===null)this.updateMatrixWorld();let{renderTarget:$,activeMipmapLevel:W}=this;if(this.coordinateSystem!==J.coordinateSystem)this.coordinateSystem=J.coordinateSystem,this.updateCoordinateSystem();let[Z,K,Y,X,H,U]=this.children,N=J.getRenderTarget(),E=J.getActiveCubeFace(),G=J.getActiveMipmapLevel(),D=J.xr.enabled;J.xr.enabled=!1;let M=$.texture.generateMipmaps;$.texture.generateMipmaps=!1;let I=!1;if(J.isWebGLRenderer===!0)I=J.state.buffers.depth.getReversed();else I=J.reversedDepthBuffer;if(J.setRenderTarget($,0,W),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,Z),J.setRenderTarget($,1,W),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,K),J.setRenderTarget($,2,W),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,Y),J.setRenderTarget($,3,W),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,X),J.setRenderTarget($,4,W),I&&J.autoClear===!1)J.clearDepth();if(J.render(Q,H),$.texture.generateMipmaps=M,J.setRenderTarget($,5,W),I&&J.autoClear===!1)J.clearDepth();J.render(Q,U),J.setRenderTarget(N,E,G),J.xr.enabled=D,$.texture.needsPMREMUpdate=!0}}class $$ extends dJ{constructor(J=[]){super();this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=J}}var W$="\\[\\]\\.:\\/",DY=new RegExp("["+W$+"]","g"),Z$="[^"+W$+"]",EY="[^"+W$.replace("\\.","")+"]",OY=/((?:WC+[\/:])*)/.source.replace("WC",Z$),RY=/(WCOD+)?/.source.replace("WCOD",EY),kY=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Z$),MY=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Z$),LY=new RegExp("^"+OY+RY+kY+MY+"$"),VY=["material","materials","bones","map"];class FZ{constructor(J,Q,$){let W=$||r0.parseTrackName(Q);this._targetGroup=J,this._bindings=J.subscribe_(Q,W)}getValue(J,Q){this.bind();let $=this._targetGroup.nCachedObjects_,W=this._bindings[$];if(W!==void 0)W.getValue(J,Q)}setValue(J,Q){let $=this._bindings;for(let W=this._targetGroup.nCachedObjects_,Z=$.length;W!==Z;++W)$[W].setValue(J,Q)}bind(){let J=this._bindings;for(let Q=this._targetGroup.nCachedObjects_,$=J.length;Q!==$;++Q)J[Q].bind()}unbind(){let J=this._bindings;for(let Q=this._targetGroup.nCachedObjects_,$=J.length;Q!==$;++Q)J[Q].unbind()}}class r0{constructor(J,Q,$){this.path=Q,this.parsedPath=$||r0.parseTrackName(Q),this.node=r0.findNode(J,this.parsedPath.nodeName),this.rootNode=J,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(J,Q,$){if(!(J&&J.isAnimationObjectGroup))return new r0(J,Q,$);else return new r0.Composite(J,Q,$)}static sanitizeNodeName(J){return J.replace(/\s/g,"_").replace(DY,"")}static parseTrackName(J){let Q=LY.exec(J);if(Q===null)throw Error("THREE.PropertyBinding: Cannot parse trackName: "+J);let $={nodeName:Q[2],objectName:Q[3],objectIndex:Q[4],propertyName:Q[5],propertyIndex:Q[6]},W=$.nodeName&&$.nodeName.lastIndexOf(".");if(W!==void 0&&W!==-1){let Z=$.nodeName.substring(W+1);if(VY.indexOf(Z)!==-1)$.nodeName=$.nodeName.substring(0,W),$.objectName=Z}if($.propertyName===null||$.propertyName.length===0)throw Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+J);return $}static findNode(J,Q){if(Q===void 0||Q===""||Q==="."||Q===-1||Q===J.name||Q===J.uuid)return J;if(J.skeleton){let $=J.skeleton.getBoneByName(Q);if($!==void 0)return $}if(J.children){let $=function(Z){for(let K=0;K<Z.length;K++){let Y=Z[K];if(Y.name===Q||Y.uuid===Q)return Y;let X=$(Y.children);if(X)return X}return null},W=$(J.children);if(W)return W}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(J,Q){J[Q]=this.targetObject[this.propertyName]}_getValue_array(J,Q){let $=this.resolvedProperty;for(let W=0,Z=$.length;W!==Z;++W)J[Q++]=$[W]}_getValue_arrayElement(J,Q){J[Q]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(J,Q){this.resolvedProperty.toArray(J,Q)}_setValue_direct(J,Q){this.targetObject[this.propertyName]=J[Q]}_setValue_direct_setNeedsUpdate(J,Q){this.targetObject[this.propertyName]=J[Q],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(J,Q){this.targetObject[this.propertyName]=J[Q],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(J,Q){let $=this.resolvedProperty;for(let W=0,Z=$.length;W!==Z;++W)$[W]=J[Q++]}_setValue_array_setNeedsUpdate(J,Q){let $=this.resolvedProperty;for(let W=0,Z=$.length;W!==Z;++W)$[W]=J[Q++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(J,Q){let $=this.resolvedProperty;for(let W=0,Z=$.length;W!==Z;++W)$[W]=J[Q++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q]}_setValue_arrayElement_setNeedsUpdate(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(J,Q){this.resolvedProperty.fromArray(J,Q)}_setValue_fromArray_setNeedsUpdate(J,Q){this.resolvedProperty.fromArray(J,Q),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(J,Q){this.resolvedProperty.fromArray(J,Q),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(J,Q){this.bind(),this.getValue(J,Q)}_setValue_unbound(J,Q){this.bind(),this.setValue(J,Q)}bind(){let J=this.node,Q=this.parsedPath,$=Q.objectName,W=Q.propertyName,Z=Q.propertyIndex;if(!J)J=r0.findNode(this.rootNode,Q.nodeName),this.node=J;if(this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!J){w0("PropertyBinding: No target node found for track: "+this.path+".");return}if($){let H=Q.objectIndex;switch($){case"materials":if(!J.material){S0("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.materials){S0("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}J=J.material.materials;break;case"bones":if(!J.skeleton){S0("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}J=J.skeleton.bones;for(let U=0;U<J.length;U++)if(J[U].name===H){H=U;break}break;case"map":if("map"in J){J=J.map;break}if(!J.material){S0("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.map){S0("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}J=J.material.map;break;default:if(J[$]===void 0){S0("PropertyBinding: Can not bind to objectName of node undefined.",this);return}J=J[$]}if(H!==void 0){if(J[H]===void 0){S0("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,J);return}J=J[H]}}let K=J[W];if(K===void 0){let H=Q.nodeName;S0("PropertyBinding: Trying to update property for track: "+H+"."+W+" but it wasn't found.",J);return}let Y=this.Versioning.None;if(this.targetObject=J,J.isMaterial===!0)Y=this.Versioning.NeedsUpdate;else if(J.isObject3D===!0)Y=this.Versioning.MatrixWorldNeedsUpdate;let X=this.BindingType.Direct;if(Z!==void 0){if(W==="morphTargetInfluences"){if(!J.geometry){S0("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!J.geometry.morphAttributes){S0("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}if(J.morphTargetDictionary[Z]!==void 0)Z=J.morphTargetDictionary[Z]}X=this.BindingType.ArrayElement,this.resolvedProperty=K,this.propertyIndex=Z}else if(K.fromArray!==void 0&&K.toArray!==void 0)X=this.BindingType.HasFromToArray,this.resolvedProperty=K;else if(Array.isArray(K))X=this.BindingType.EntireArray,this.resolvedProperty=K;else this.propertyName=W;this.getValue=this.GetterByBindingType[X],this.setValue=this.SetterByBindingTypeAndVersioning[X][Y]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}r0.Composite=FZ;r0.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};r0.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};r0.prototype.GetterByBindingType=[r0.prototype._getValue_direct,r0.prototype._getValue_array,r0.prototype._getValue_arrayElement,r0.prototype._getValue_toArray];r0.prototype.SetterByBindingTypeAndVersioning=[[r0.prototype._setValue_direct,r0.prototype._setValue_direct_setNeedsUpdate,r0.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[r0.prototype._setValue_array,r0.prototype._setValue_array_setNeedsUpdate,r0.prototype._setValue_array_setMatrixWorldNeedsUpdate],[r0.prototype._setValue_arrayElement,r0.prototype._setValue_arrayElement_setNeedsUpdate,r0.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[r0.prototype._setValue_fromArray,r0.prototype._setValue_fromArray_setNeedsUpdate,r0.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var hN=new Float32Array(1);var KW=new YJ;class t7{constructor(J,Q,$=0,W=1/0){this.ray=new f8(J,Q),this.near=$,this.far=W,this.camera=null,this.layers=new $7,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(J,Q){this.ray.set(J,Q)}setFromCamera(J,Q){if(Q.isPerspectiveCamera)this.ray.origin.setFromMatrixPosition(Q.matrixWorld),this.ray.direction.set(J.x,J.y,0.5).unproject(Q).sub(this.ray.origin).normalize(),this.camera=Q;else if(Q.isOrthographicCamera)this.ray.origin.set(J.x,J.y,Q.projectionMatrix.elements[14]).unproject(Q),this.ray.direction.set(0,0,-1).transformDirection(Q.matrixWorld),this.camera=Q;else S0("Raycaster: Unsupported camera type: "+Q.type)}setFromXRController(J){return KW.identity().extractRotation(J.matrixWorld),this.ray.origin.setFromMatrixPosition(J.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(KW),this}intersectObject(J,Q=!0,$=[]){return y6(J,this,$,Q),$.sort(YW),$}intersectObjects(J,Q=!0,$=[]){for(let W=0,Z=J.length;W<Z;W++)y6(J[W],this,$,Q);return $.sort(YW),$}}function YW(J,Q){return J.distance-Q.distance}function y6(J,Q,$,W){let Z=!0;if(J.layers.test(Q.layers)){if(J.raycast(Q,$)===!1)Z=!1}if(Z===!0&&W===!0){let K=J.children;for(let Y=0,X=K.length;Y<X;Y++)y6(K[Y],Q,$,!0)}}class K7{constructor(J=1,Q=0,$=0){this.radius=J,this.phi=Q,this.theta=$}set(J,Q,$){return this.radius=J,this.phi=Q,this.theta=$,this}copy(J){return this.radius=J.radius,this.phi=J.phi,this.theta=J.theta,this}makeSafe(){return this.phi=x0(this.phi,0.000001,Math.PI-0.000001),this}setFromVector3(J){return this.setFromCartesianCoords(J.x,J.y,J.z)}setFromCartesianCoords(J,Q,$){if(this.radius=Math.sqrt(J*J+Q*Q+$*$),this.radius===0)this.theta=0,this.phi=0;else this.theta=Math.atan2(J,$),this.phi=Math.acos(x0(Q/this.radius,-1,1));return this}clone(){return new this.constructor().copy(this)}}class K${static{K$.prototype.isMatrix2=!0}constructor(J,Q,$,W){if(this.elements=[1,0,0,1],J!==void 0)this.set(J,Q,$,W)}identity(){return this.set(1,0,0,1),this}fromArray(J,Q=0){for(let $=0;$<4;$++)this.elements[$]=J[$+Q];return this}set(J,Q,$,W){let Z=this.elements;return Z[0]=J,Z[2]=Q,Z[1]=$,Z[3]=W,this}}class e7 extends q9{constructor(J,Q=null){super();this.object=J,this.domElement=Q,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(J){if(this.domElement!==null)this.disconnect();this.domElement=J}disconnect(){}dispose(){}update(){}}function Y$(J,Q,$,W){let Z=BY(W);switch($){case 1021:return J*Q;case 1028:return J*Q/Z.components*Z.byteLength;case 1029:return J*Q/Z.components*Z.byteLength;case 1030:return J*Q*2/Z.components*Z.byteLength;case 1031:return J*Q*2/Z.components*Z.byteLength;case 1022:return J*Q*3/Z.components*Z.byteLength;case 1023:return J*Q*4/Z.components*Z.byteLength;case 1033:return J*Q*4/Z.components*Z.byteLength;case 33776:case 33777:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*8;case 33778:case 33779:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 35841:case 35843:return Math.max(J,16)*Math.max(Q,8)/4;case 35840:case 35842:return Math.max(J,8)*Math.max(Q,8)/2;case 36196:case 37492:case 37488:case 37489:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*8;case 37496:case 37490:case 37491:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 37808:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 37809:return Math.floor((J+4)/5)*Math.floor((Q+3)/4)*16;case 37810:return Math.floor((J+4)/5)*Math.floor((Q+4)/5)*16;case 37811:return Math.floor((J+5)/6)*Math.floor((Q+4)/5)*16;case 37812:return Math.floor((J+5)/6)*Math.floor((Q+5)/6)*16;case 37813:return Math.floor((J+7)/8)*Math.floor((Q+4)/5)*16;case 37814:return Math.floor((J+7)/8)*Math.floor((Q+5)/6)*16;case 37815:return Math.floor((J+7)/8)*Math.floor((Q+7)/8)*16;case 37816:return Math.floor((J+9)/10)*Math.floor((Q+4)/5)*16;case 37817:return Math.floor((J+9)/10)*Math.floor((Q+5)/6)*16;case 37818:return Math.floor((J+9)/10)*Math.floor((Q+7)/8)*16;case 37819:return Math.floor((J+9)/10)*Math.floor((Q+9)/10)*16;case 37820:return Math.floor((J+11)/12)*Math.floor((Q+9)/10)*16;case 37821:return Math.floor((J+11)/12)*Math.floor((Q+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(J/4)*Math.ceil(Q/4)*16;case 36283:case 36284:return Math.ceil(J/4)*Math.ceil(Q/4)*8;case 36285:case 36286:return Math.ceil(J/4)*Math.ceil(Q/4)*16}throw Error(`Unable to determine texture byte length for ${$} format.`)}function BY(J){switch(J){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:case 35899:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${J}.`)}if(typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));if(typeof window<"u")if(window.__THREE__)w0("WARNING: Multiple instances of Three.js being imported.");else window.__THREE__="186";function vZ(){let J=null,Q=!1,$=null,W=null;function Z(K,Y){W=J.requestAnimationFrame(Z),$(K,Y)}return{start:function(){if(Q===!0)return;if($===null)return;if(J===null)return;W=J.requestAnimationFrame(Z),Q=!0},stop:function(){if(J!==null)J.cancelAnimationFrame(W);Q=!1},setAnimationLoop:function(K){$=K},setContext:function(K){J=K}}}function IY(J){let Q=new WeakMap;function $(X,H){let{array:U,usage:N}=X,E=U.byteLength,G=J.createBuffer();J.bindBuffer(H,G),J.bufferData(H,U,N),X.onUploadCallback();let D;if(U instanceof Float32Array)D=J.FLOAT;else if(typeof Float16Array<"u"&&U instanceof Float16Array)D=J.HALF_FLOAT;else if(U instanceof Uint16Array)if(X.isFloat16BufferAttribute)D=J.HALF_FLOAT;else D=J.UNSIGNED_SHORT;else if(U instanceof Int16Array)D=J.SHORT;else if(U instanceof Uint32Array)D=J.UNSIGNED_INT;else if(U instanceof Int32Array)D=J.INT;else if(U instanceof Int8Array)D=J.BYTE;else if(U instanceof Uint8Array)D=J.UNSIGNED_BYTE;else if(U instanceof Uint8ClampedArray)D=J.UNSIGNED_BYTE;else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: "+U);return{buffer:G,type:D,bytesPerElement:U.BYTES_PER_ELEMENT,version:X.version,size:E}}function W(X,H,U){let{array:N,updateRanges:E}=H;if(J.bindBuffer(U,X),E.length===0)J.bufferSubData(U,0,N);else{E.sort((D,M)=>D.start-M.start);let G=0;for(let D=1;D<E.length;D++){let M=E[G],I=E[D];if(I.start<=M.start+M.count+1)M.count=Math.max(M.count,I.start+I.count-M.start);else++G,E[G]=I}E.length=G+1;for(let D=0,M=E.length;D<M;D++){let I=E[D];J.bufferSubData(U,I.start*N.BYTES_PER_ELEMENT,N,I.start,I.count)}H.clearUpdateRanges()}H.onUploadCallback()}function Z(X){if(X.isInterleavedBufferAttribute)X=X.data;return Q.get(X)}function K(X){if(X.isInterleavedBufferAttribute)X=X.data;let H=Q.get(X);if(H)J.deleteBuffer(H.buffer),Q.delete(X)}function Y(X,H){if(X.isInterleavedBufferAttribute)X=X.data;if(X.isGLBufferAttribute){let N=Q.get(X);if(!N||N.version<X.version)Q.set(X,{buffer:X.buffer,type:X.type,bytesPerElement:X.elementSize,version:X.version});return}let U=Q.get(X);if(U===void 0)Q.set(X,$(X,H));else if(U.version<X.version){if(U.size!==X.array.byteLength)throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");W(U.buffer,X,H),U.version=X.version}}return{get:Z,remove:K,update:Y}}var zY=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,AY=`#ifdef USE_ALPHAHASH
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
#endif`,PY=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,CY=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,wY=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,_Y=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,TY=`#ifdef USE_AOMAP
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
#endif`,SY=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,jY=`#ifdef USE_BATCHING
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
#endif`,yY=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,fY=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,vY=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,hY=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,bY=`#ifdef USE_IRIDESCENCE
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
#endif`,xY=`#ifdef USE_BUMPMAP
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
#endif`,gY=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,pY=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,mY=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,lY=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,dY=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,uY=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,cY=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,nY=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,sY=`#define PI 3.141592653589793
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
} // validated`,iY=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,oY=`vec3 transformedNormal = objectNormal;
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
#endif`,aY=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,rY=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,tY=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,eY=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,JX="gl_FragColor = linearToOutputTexel( gl_FragColor );",QX=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,$X=`#ifdef USE_ENVMAP
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
#endif`,WX=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,ZX=`#ifdef USE_ENVMAP
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
#endif`,KX=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,YX=`#ifdef USE_ENVMAP
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
#endif`,XX=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,HX=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,UX=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,GX=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,NX=`#ifdef USE_GRADIENTMAP
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
}`,qX=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,FX=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,DX=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,EX=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,OX=`#ifdef USE_ENVMAP
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
#endif`,RX=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,kX=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,MX=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,LX=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,VX=`PhysicalMaterial material;
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
#endif`,BX=`uniform sampler2D dfgLUT;
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
}`,IX=`
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
#endif`,zX=`#if defined( RE_IndirectDiffuse )
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
#endif`,AX=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,PX=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,CX=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,wX=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,_X=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,TX=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,SX=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,jX=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,yX=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,fX=`#if defined( USE_POINTS_UV )
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
#endif`,vX=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,hX=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,bX=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,xX=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,gX=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,pX=`#ifdef USE_MORPHTARGETS
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
#endif`,mX=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,lX=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,dX=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,uX=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,cX=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,nX=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,sX=`#ifdef USE_NORMALMAP
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
#endif`,iX=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,oX=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,aX=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,rX=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,tX=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,eX=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,JH=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,QH=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,$H=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,WH=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,ZH=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,KH=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,YH=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,XH=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,HH=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,UH=`float getShadowMask() {
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
}`,GH=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,NH=`#ifdef USE_SKINNING
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
#endif`,qH=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,FH=`#ifdef USE_SKINNING
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
#endif`,DH=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,EH=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,OH=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,RH=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,kH=`#ifdef USE_TRANSMISSION
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
#endif`,MH=`#ifdef USE_TRANSMISSION
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
#endif`,LH=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,VH=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,BH=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,IH=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,zH=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,AH=`uniform sampler2D t2D;
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
}`,PH=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,CH=`#ifdef ENVMAP_TYPE_CUBE
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
}`,wH=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,_H=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,TH=`#include <common>
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
}`,SH=`#if DEPTH_PACKING == 3200
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
}`,jH=`#define DISTANCE
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
}`,yH=`#define DISTANCE
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
}`,fH=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,vH=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,hH=`uniform float scale;
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
}`,bH=`uniform vec3 diffuse;
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
}`,xH=`#include <common>
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
}`,gH=`uniform vec3 diffuse;
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
}`,pH=`#define LAMBERT
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
}`,mH=`#define LAMBERT
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
}`,lH=`#define MATCAP
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
}`,dH=`#define MATCAP
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
}`,uH=`#define NORMAL
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
}`,cH=`#define NORMAL
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
}`,nH=`#define PHONG
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
}`,sH=`#define PHONG
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
}`,iH=`#define STANDARD
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
}`,oH=`#define STANDARD
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
}`,aH=`#define TOON
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
}`,rH=`#define TOON
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
}`,tH=`uniform float size;
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
}`,eH=`uniform vec3 diffuse;
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
}`,JU=`#include <common>
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
}`,QU=`uniform vec3 color;
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
}`,$U=`uniform float rotation;
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
}`,WU=`uniform vec3 diffuse;
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
}`,h0={alphahash_fragment:zY,alphahash_pars_fragment:AY,alphamap_fragment:PY,alphamap_pars_fragment:CY,alphatest_fragment:wY,alphatest_pars_fragment:_Y,aomap_fragment:TY,aomap_pars_fragment:SY,batching_pars_vertex:jY,batching_vertex:yY,begin_vertex:fY,beginnormal_vertex:vY,bsdfs:hY,iridescence_fragment:bY,bumpmap_pars_fragment:xY,clipping_planes_fragment:gY,clipping_planes_pars_fragment:pY,clipping_planes_pars_vertex:mY,clipping_planes_vertex:lY,color_fragment:dY,color_pars_fragment:uY,color_pars_vertex:cY,color_vertex:nY,common:sY,cube_uv_reflection_fragment:iY,defaultnormal_vertex:oY,displacementmap_pars_vertex:aY,displacementmap_vertex:rY,emissivemap_fragment:tY,emissivemap_pars_fragment:eY,colorspace_fragment:JX,colorspace_pars_fragment:QX,envmap_fragment:$X,envmap_common_pars_fragment:WX,envmap_pars_fragment:ZX,envmap_pars_vertex:KX,envmap_physical_pars_fragment:OX,envmap_vertex:YX,fog_vertex:XX,fog_pars_vertex:HX,fog_fragment:UX,fog_pars_fragment:GX,gradientmap_pars_fragment:NX,lightmap_pars_fragment:qX,lights_lambert_fragment:FX,lights_lambert_pars_fragment:DX,lights_pars_begin:EX,lights_toon_fragment:RX,lights_toon_pars_fragment:kX,lights_phong_fragment:MX,lights_phong_pars_fragment:LX,lights_physical_fragment:VX,lights_physical_pars_fragment:BX,lights_fragment_begin:IX,lights_fragment_maps:zX,lights_fragment_end:AX,lightprobes_pars_fragment:PX,logdepthbuf_fragment:CX,logdepthbuf_pars_fragment:wX,logdepthbuf_pars_vertex:_X,logdepthbuf_vertex:TX,map_fragment:SX,map_pars_fragment:jX,map_particle_fragment:yX,map_particle_pars_fragment:fX,metalnessmap_fragment:vX,metalnessmap_pars_fragment:hX,morphinstance_vertex:bX,morphcolor_vertex:xX,morphnormal_vertex:gX,morphtarget_pars_vertex:pX,morphtarget_vertex:mX,normal_fragment_begin:lX,normal_fragment_maps:dX,normal_pars_fragment:uX,normal_pars_vertex:cX,normal_vertex:nX,normalmap_pars_fragment:sX,clearcoat_normal_fragment_begin:iX,clearcoat_normal_fragment_maps:oX,clearcoat_pars_fragment:aX,iridescence_pars_fragment:rX,opaque_fragment:tX,packing:eX,premultiplied_alpha_fragment:JH,project_vertex:QH,dithering_fragment:$H,dithering_pars_fragment:WH,roughnessmap_fragment:ZH,roughnessmap_pars_fragment:KH,shadowmap_pars_fragment:YH,shadowmap_pars_vertex:XH,shadowmap_vertex:HH,shadowmask_pars_fragment:UH,skinbase_vertex:GH,skinning_pars_vertex:NH,skinning_vertex:qH,skinnormal_vertex:FH,specularmap_fragment:DH,specularmap_pars_fragment:EH,tonemapping_fragment:OH,tonemapping_pars_fragment:RH,transmission_fragment:kH,transmission_pars_fragment:MH,uv_pars_fragment:LH,uv_pars_vertex:VH,uv_vertex:BH,worldpos_vertex:IH,background_vert:zH,background_frag:AH,backgroundCube_vert:PH,backgroundCube_frag:CH,cube_vert:wH,cube_frag:_H,depth_vert:TH,depth_frag:SH,distance_vert:jH,distance_frag:yH,equirect_vert:fH,equirect_frag:vH,linedashed_vert:hH,linedashed_frag:bH,meshbasic_vert:xH,meshbasic_frag:gH,meshlambert_vert:pH,meshlambert_frag:mH,meshmatcap_vert:lH,meshmatcap_frag:dH,meshnormal_vert:uH,meshnormal_frag:cH,meshphong_vert:nH,meshphong_frag:sH,meshphysical_vert:iH,meshphysical_frag:oH,meshtoon_vert:aH,meshtoon_frag:rH,points_vert:tH,points_frag:eH,shadow_vert:JU,shadow_frag:QU,sprite_vert:$U,sprite_frag:WU},G0={common:{diffuse:{value:new C0(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new y0},alphaMap:{value:null},alphaMapTransform:{value:new y0},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new y0}},envmap:{envMap:{value:null},envMapRotation:{value:new y0},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:0.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new y0}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new y0}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new y0},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new y0},normalScale:{value:new j0(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new y0},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new y0}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new y0}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new y0}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:0.00025},fogNear:{value:1},fogFar:{value:2000},fogColor:{value:new C0(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new v},probesMax:{value:new v},probesResolution:{value:new v}},points:{diffuse:{value:new C0(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new y0},alphaTest:{value:0},uvTransform:{value:new y0}},sprite:{diffuse:{value:new C0(16777215)},opacity:{value:1},center:{value:new j0(0.5,0.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new y0},alphaMap:{value:null},alphaMapTransform:{value:new y0},alphaTest:{value:0}}},E9={basic:{uniforms:TJ([G0.common,G0.specularmap,G0.envmap,G0.aomap,G0.lightmap,G0.fog]),vertexShader:h0.meshbasic_vert,fragmentShader:h0.meshbasic_frag},lambert:{uniforms:TJ([G0.common,G0.specularmap,G0.envmap,G0.aomap,G0.lightmap,G0.emissivemap,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.fog,G0.lights,{emissive:{value:new C0(0)},envMapIntensity:{value:1}}]),vertexShader:h0.meshlambert_vert,fragmentShader:h0.meshlambert_frag},phong:{uniforms:TJ([G0.common,G0.specularmap,G0.envmap,G0.aomap,G0.lightmap,G0.emissivemap,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.fog,G0.lights,{emissive:{value:new C0(0)},specular:{value:new C0(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:h0.meshphong_vert,fragmentShader:h0.meshphong_frag},standard:{uniforms:TJ([G0.common,G0.envmap,G0.aomap,G0.lightmap,G0.emissivemap,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.roughnessmap,G0.metalnessmap,G0.fog,G0.lights,{emissive:{value:new C0(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:h0.meshphysical_vert,fragmentShader:h0.meshphysical_frag},toon:{uniforms:TJ([G0.common,G0.aomap,G0.lightmap,G0.emissivemap,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.gradientmap,G0.fog,G0.lights,{emissive:{value:new C0(0)}}]),vertexShader:h0.meshtoon_vert,fragmentShader:h0.meshtoon_frag},matcap:{uniforms:TJ([G0.common,G0.bumpmap,G0.normalmap,G0.displacementmap,G0.fog,{matcap:{value:null}}]),vertexShader:h0.meshmatcap_vert,fragmentShader:h0.meshmatcap_frag},points:{uniforms:TJ([G0.points,G0.fog]),vertexShader:h0.points_vert,fragmentShader:h0.points_frag},dashed:{uniforms:TJ([G0.common,G0.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:h0.linedashed_vert,fragmentShader:h0.linedashed_frag},depth:{uniforms:TJ([G0.common,G0.displacementmap]),vertexShader:h0.depth_vert,fragmentShader:h0.depth_frag},normal:{uniforms:TJ([G0.common,G0.bumpmap,G0.normalmap,G0.displacementmap,{opacity:{value:1}}]),vertexShader:h0.meshnormal_vert,fragmentShader:h0.meshnormal_frag},sprite:{uniforms:TJ([G0.sprite,G0.fog]),vertexShader:h0.sprite_vert,fragmentShader:h0.sprite_frag},background:{uniforms:{uvTransform:{value:new y0},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:h0.background_vert,fragmentShader:h0.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new y0}},vertexShader:h0.backgroundCube_vert,fragmentShader:h0.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:h0.cube_vert,fragmentShader:h0.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:h0.equirect_vert,fragmentShader:h0.equirect_frag},distance:{uniforms:TJ([G0.common,G0.displacementmap,{referencePosition:{value:new v},nearDistance:{value:1},farDistance:{value:1000}}]),vertexShader:h0.distance_vert,fragmentShader:h0.distance_frag},shadow:{uniforms:TJ([G0.lights,G0.fog,{color:{value:new C0(0)},opacity:{value:1}}]),vertexShader:h0.shadow_vert,fragmentShader:h0.shadow_frag}};E9.physical={uniforms:TJ([E9.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new y0},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new y0},clearcoatNormalScale:{value:new j0(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new y0},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new y0},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new y0},sheen:{value:0},sheenColor:{value:new C0(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new y0},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new y0},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new y0},transmissionSamplerSize:{value:new j0},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new y0},attenuationDistance:{value:0},attenuationColor:{value:new C0(0)},specularColor:{value:new C0(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new y0},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new y0},anisotropyVector:{value:new j0},anisotropyMap:{value:null},anisotropyMapTransform:{value:new y0}}]),vertexShader:h0.meshphysical_vert,fragmentShader:h0.meshphysical_frag};var J6={r:0,b:0,g:0},ZU=new YJ,hZ=new y0;hZ.set(-1,0,0,0,1,0,0,0,1);function KU(J,Q,$,W,Z,K){let Y=new C0(0),X=Z===!0?0:1,H,U,N=null,E=0,G=null;function D(A){let j=A.isScene===!0?A.background:null;if(j&&j.isTexture){let V=A.backgroundBlurriness>0;j=Q.get(j,V)}return j}function M(A){let j=!1,V=D(A);if(V===null)F(Y,X);else if(V&&V.isColor)F(V,1),j=!0;let z=J.xr.getEnvironmentBlendMode();if(z==="additive")$.buffers.color.setClear(0,0,0,1,K);else if(z==="alpha-blend")$.buffers.color.setClear(0,0,0,0,K);if(J.autoClear||j)$.buffers.depth.setTest(!0),$.buffers.depth.setMask(!0),$.buffers.color.setMask(!0),J.clear(J.autoClearColor,J.autoClearDepth,J.autoClearStencil)}function I(A,j){let V=D(j);if(V&&(V.isCubeTexture||V.mapping===t8)){if(U===void 0)U=new BJ(new x9(1,1,1),new zJ({name:"BackgroundCubeMaterial",uniforms:$8(E9.backgroundCube.uniforms),vertexShader:E9.backgroundCube.vertexShader,fragmentShader:E9.backgroundCube.fragmentShader,side:bJ,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),U.geometry.deleteAttribute("normal"),U.geometry.deleteAttribute("uv"),U.onBeforeRender=function(z,P,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(U.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),W.update(U);if(U.material.uniforms.envMap.value=V,U.material.uniforms.backgroundBlurriness.value=j.backgroundBlurriness,U.material.uniforms.backgroundIntensity.value=j.backgroundIntensity,U.material.uniforms.backgroundRotation.value.setFromMatrix4(ZU.makeRotationFromEuler(j.backgroundRotation)).transpose(),V.isCubeTexture&&V.isRenderTargetTexture===!1)U.material.uniforms.backgroundRotation.value.premultiply(hZ);if(U.material.toneMapped=m0.getTransfer(V.colorSpace)!==$J,N!==V||E!==V.version||G!==J.toneMapping)U.material.needsUpdate=!0,N=V,E=V.version,G=J.toneMapping;U.layers.enableAll(),A.unshift(U,U.geometry,U.material,0,0,null)}else if(V&&V.isTexture){if(H===void 0)H=new BJ(new Q8(2,2),new zJ({name:"BackgroundMaterial",uniforms:$8(E9.background.uniforms),vertexShader:E9.background.vertexShader,fragmentShader:E9.background.fragmentShader,side:w8,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),H.geometry.deleteAttribute("normal"),Object.defineProperty(H.material,"map",{get:function(){return this.uniforms.t2D.value}}),W.update(H);if(H.material.uniforms.t2D.value=V,H.material.uniforms.backgroundIntensity.value=j.backgroundIntensity,H.material.toneMapped=m0.getTransfer(V.colorSpace)!==$J,V.matrixAutoUpdate===!0)V.updateMatrix();if(H.material.uniforms.uvTransform.value.copy(V.matrix),N!==V||E!==V.version||G!==J.toneMapping)H.material.needsUpdate=!0,N=V,E=V.version,G=J.toneMapping;H.layers.enableAll(),A.unshift(H,H.geometry,H.material,0,0,null)}}function F(A,j){A.getRGB(J6,mQ(J)),$.buffers.color.setClear(J6.r,J6.g,J6.b,j,K)}function q(){if(U!==void 0)U.geometry.dispose(),U.material.dispose(),U=void 0;if(H!==void 0)H.geometry.dispose(),H.material.dispose(),H=void 0}return{getClearColor:function(){return Y},setClearColor:function(A,j=1){Y.set(A),X=j,F(Y,X)},getClearAlpha:function(){return X},setClearAlpha:function(A){X=A,F(Y,X)},render:M,addToRenderList:I,dispose:q}}function YU(J,Q){let $=J.getParameter(J.MAX_VERTEX_ATTRIBS),W={},Z=G(null),K=Z,Y=!1;function X(f,h,a,_,d){let o=!1,p=E(f,_,a,h);if(K!==p)K=p,U(K.object);if(o=D(f,_,a,d),o)M(f,_,a,d);if(d!==null)Q.update(d,J.ELEMENT_ARRAY_BUFFER);if(o||Y){if(Y=!1,V(f,h,a,_),d!==null)J.bindBuffer(J.ELEMENT_ARRAY_BUFFER,Q.get(d).buffer)}}function H(){return J.createVertexArray()}function U(f){return J.bindVertexArray(f)}function N(f){return J.deleteVertexArray(f)}function E(f,h,a,_){let d=_.wireframe===!0,o=W[h.id];if(o===void 0)o={},W[h.id]=o;let p=f.isInstancedMesh===!0?f.id:0,Q0=o[p];if(Q0===void 0)Q0={},o[p]=Q0;let c=Q0[a.id];if(c===void 0)c={},Q0[a.id]=c;let r=c[d];if(r===void 0)r=G(H()),c[d]=r;return r}function G(f){let h=[],a=[],_=[];for(let d=0;d<$;d++)h[d]=0,a[d]=0,_[d]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:h,enabledAttributes:a,attributeDivisors:_,object:f,attributes:{},index:null}}function D(f,h,a,_){let d=K.attributes,o=h.attributes,p=0,Q0=a.getAttributes();for(let c in Q0)if(Q0[c].location>=0){let J0=d[c],_0=o[c];if(_0===void 0){if(c==="instanceMatrix"&&f.instanceMatrix)_0=f.instanceMatrix;if(c==="instanceColor"&&f.instanceColor)_0=f.instanceColor}if(J0===void 0)return!0;if(J0.attribute!==_0)return!0;if(_0&&J0.data!==_0.data)return!0;p++}if(K.attributesNum!==p)return!0;if(K.index!==_)return!0;return!1}function M(f,h,a,_){let d={},o=h.attributes,p=0,Q0=a.getAttributes();for(let c in Q0)if(Q0[c].location>=0){let J0=o[c];if(J0===void 0){if(c==="instanceMatrix"&&f.instanceMatrix)J0=f.instanceMatrix;if(c==="instanceColor"&&f.instanceColor)J0=f.instanceColor}let _0={};if(_0.attribute=J0,J0&&J0.data)_0.data=J0.data;d[c]=_0,p++}K.attributes=d,K.attributesNum=p,K.index=_}function I(){let f=K.newAttributes;for(let h=0,a=f.length;h<a;h++)f[h]=0}function F(f){q(f,0)}function q(f,h){let{newAttributes:a,enabledAttributes:_,attributeDivisors:d}=K;if(a[f]=1,_[f]===0)J.enableVertexAttribArray(f),_[f]=1;if(d[f]!==h)J.vertexAttribDivisor(f,h),d[f]=h}function A(){let{newAttributes:f,enabledAttributes:h}=K;for(let a=0,_=h.length;a<_;a++)if(h[a]!==f[a])J.disableVertexAttribArray(a),h[a]=0}function j(f,h,a,_,d,o,p){if(p===!0)J.vertexAttribIPointer(f,h,a,d,o);else J.vertexAttribPointer(f,h,a,_,d,o)}function V(f,h,a,_){I();let d=_.attributes,o=a.getAttributes(),p=h.defaultAttributeValues;for(let Q0 in o){let c=o[Q0];if(c.location>=0){let r=d[Q0];if(r===void 0){if(Q0==="instanceMatrix"&&f.instanceMatrix)r=f.instanceMatrix;if(Q0==="instanceColor"&&f.instanceColor)r=f.instanceColor}if(r!==void 0){let{normalized:J0,itemSize:_0}=r,z0=Q.get(r);if(z0===void 0)continue;let{buffer:WJ,type:b0,bytesPerElement:n}=z0,$0=b0===J.INT||b0===J.UNSIGNED_INT||r.gpuType===n6;if(r.isInterleavedBufferAttribute){let Z0=r.data,A0=Z0.stride,T0=r.offset;if(Z0.isInstancedInterleavedBuffer){for(let B0=0;B0<c.locationSize;B0++)q(c.location+B0,Z0.meshPerAttribute);if(f.isInstancedMesh!==!0&&_._maxInstanceCount===void 0)_._maxInstanceCount=Z0.meshPerAttribute*Z0.count}else for(let B0=0;B0<c.locationSize;B0++)F(c.location+B0);J.bindBuffer(J.ARRAY_BUFFER,WJ);for(let B0=0;B0<c.locationSize;B0++)j(c.location+B0,_0/c.locationSize,b0,J0,A0*n,(T0+_0/c.locationSize*B0)*n,$0)}else{if(r.isInstancedBufferAttribute){for(let Z0=0;Z0<c.locationSize;Z0++)q(c.location+Z0,r.meshPerAttribute);if(f.isInstancedMesh!==!0&&_._maxInstanceCount===void 0)_._maxInstanceCount=r.meshPerAttribute*r.count}else for(let Z0=0;Z0<c.locationSize;Z0++)F(c.location+Z0);J.bindBuffer(J.ARRAY_BUFFER,WJ);for(let Z0=0;Z0<c.locationSize;Z0++)j(c.location+Z0,_0/c.locationSize,b0,J0,_0*n,_0/c.locationSize*Z0*n,$0)}}else if(p!==void 0){let J0=p[Q0];if(J0!==void 0)switch(J0.length){case 2:J.vertexAttrib2fv(c.location,J0);break;case 3:J.vertexAttrib3fv(c.location,J0);break;case 4:J.vertexAttrib4fv(c.location,J0);break;default:J.vertexAttrib1fv(c.location,J0)}}}}A()}function z(){B();for(let f in W){let h=W[f];for(let a in h){let _=h[a];for(let d in _){let o=_[d];for(let p in o)N(o[p].object),delete o[p];delete _[d]}}delete W[f]}}function P(f){if(W[f.id]===void 0)return;let h=W[f.id];for(let a in h){let _=h[a];for(let d in _){let o=_[d];for(let p in o)N(o[p].object),delete o[p];delete _[d]}}delete W[f.id]}function C(f){for(let h in W){let a=W[h];for(let _ in a){let d=a[_];if(d[f.id]===void 0)continue;let o=d[f.id];for(let p in o)N(o[p].object),delete o[p];delete d[f.id]}}}function k(f){for(let h in W){let a=W[h],_=f.isInstancedMesh===!0?f.id:0,d=a[_];if(d===void 0)continue;for(let o in d){let p=d[o];for(let Q0 in p)N(p[Q0].object),delete p[Q0];delete d[o]}if(delete a[_],Object.keys(a).length===0)delete W[h]}}function B(){if(g(),Y=!0,K===Z)return;K=Z,U(K.object)}function g(){Z.geometry=null,Z.program=null,Z.wireframe=!1}return{setup:X,reset:B,resetDefaultState:g,dispose:z,releaseStatesOfGeometry:P,releaseStatesOfObject:k,releaseStatesOfProgram:C,initAttributes:I,enableAttribute:F,disableUnusedAttributes:A}}function XU(J,Q,$){let W;function Z(H){W=H}function K(H,U){J.drawArrays(W,H,U),$.update(U,W,1)}function Y(H,U,N){if(N===0)return;J.drawArraysInstanced(W,H,U,N),$.update(U,W,N)}function X(H,U,N){if(N===0)return;Q.get("WEBGL_multi_draw").multiDrawArraysWEBGL(W,H,0,U,0,N);let G=0;for(let D=0;D<N;D++)G+=U[D];$.update(G,W,1)}this.setMode=Z,this.render=K,this.renderInstances=Y,this.renderMultiDraw=X}function HU(J,Q,$,W){let Z;function K(){if(Z!==void 0)return Z;if(Q.has("EXT_texture_filter_anisotropic")===!0){let C=Q.get("EXT_texture_filter_anisotropic");Z=J.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else Z=0;return Z}function Y(C){if(C!==N9&&W.convert(C)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_FORMAT))return!1;return!0}function X(C){let k=C===G9&&(Q.has("EXT_color_buffer_half_float")||Q.has("EXT_color_buffer_float"));if(C!==Z9&&C!==I9&&!k&&W.convert(C)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_TYPE))return!1;return!0}function H(C){if(C==="highp"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.HIGH_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.HIGH_FLOAT).precision>0)return"highp";C="mediump"}if(C==="mediump"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.MEDIUM_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.MEDIUM_FLOAT).precision>0)return"mediump"}return"lowp"}let U=$.precision!==void 0?$.precision:"highp",N=H(U);if(N!==U)w0("WebGLRenderer:",U,"not supported, using",N,"instead."),U=N;let E=$.logarithmicDepthBuffer===!0,G=$.reversedDepthBuffer===!0&&Q.has("EXT_clip_control");if($.reversedDepthBuffer===!0&&G===!1)w0("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let D=J.getParameter(J.MAX_TEXTURE_IMAGE_UNITS),M=J.getParameter(J.MAX_VERTEX_TEXTURE_IMAGE_UNITS),I=J.getParameter(J.MAX_TEXTURE_SIZE),F=J.getParameter(J.MAX_CUBE_MAP_TEXTURE_SIZE),q=J.getParameter(J.MAX_VERTEX_ATTRIBS),A=J.getParameter(J.MAX_VERTEX_UNIFORM_VECTORS),j=J.getParameter(J.MAX_VARYING_VECTORS),V=J.getParameter(J.MAX_FRAGMENT_UNIFORM_VECTORS),z=J.getParameter(J.MAX_SAMPLES),P=J.getParameter(J.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:K,getMaxPrecision:H,textureFormatReadable:Y,textureTypeReadable:X,precision:U,logarithmicDepthBuffer:E,reversedDepthBuffer:G,maxTextures:D,maxVertexTextures:M,maxTextureSize:I,maxCubemapSize:F,maxAttributes:q,maxVertexUniforms:A,maxVaryings:j,maxFragmentUniforms:V,maxSamples:z,samples:P}}function UU(J){let Q=this,$=null,W=0,Z=!1,K=!1,Y=new iJ,X=new y0,H={value:null,needsUpdate:!1};this.uniform=H,this.numPlanes=0,this.numIntersection=0,this.init=function(E,G){let D=E.length!==0||G||W!==0||Z;return Z=G,W=E.length,D},this.beginShadows=function(){K=!0,N(null)},this.endShadows=function(){K=!1},this.setGlobalState=function(E,G){$=N(E,G,0)},this.setState=function(E,G,D){let{clippingPlanes:M,clipIntersection:I,clipShadows:F}=E,q=J.get(E);if(!Z||M===null||M.length===0||K&&!F)if(K)N(null);else U();else{let A=K?0:W,j=A*4,V=q.clippingState||null;H.value=V,V=N(M,G,j,D);for(let z=0;z!==j;++z)V[z]=$[z];q.clippingState=V,this.numIntersection=I?this.numPlanes:0,this.numPlanes+=A}};function U(){if(H.value!==$)H.value=$,H.needsUpdate=W>0;Q.numPlanes=W,Q.numIntersection=0}function N(E,G,D,M){let I=E!==null?E.length:0,F=null;if(I!==0){if(F=H.value,M!==!0||F===null){let q=D+I*4,A=G.matrixWorldInverse;if(X.getNormalMatrix(A),F===null||F.length<q)F=new Float32Array(q);for(let j=0,V=D;j!==I;++j,V+=4)Y.copy(E[j]).applyMatrix4(A,X),Y.normal.toArray(F,V),F[V+3]=Y.constant}H.value=F,H.needsUpdate=!0}return Q.numPlanes=I,Q.numIntersection=0,F}}var x8=4,GU=6,NU=20,qU=256,Y7=new h8,DZ=new C0,X$=null,H$=0,U$=0,G$=!1,FU=new v,Y8=new v;class F${constructor(J){this._renderer=J,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(J,Q=0,$=0.1,W=100,Z={}){let{size:K=256,position:Y=FU}=Z;X$=this._renderer.getRenderTarget(),H$=this._renderer.getActiveCubeFace(),U$=this._renderer.getActiveMipmapLevel(),G$=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(K);let X=this._allocateTargets();if(X.depthBuffer=!0,this._sceneToCubeUV(J,$,W,X,Y),Q>0)this._blur(X,0,0,Q);return this._applyPMREM(X),this._cleanup(X),X}fromEquirectangular(J,Q=null){return this._fromTexture(J,Q)}fromCubemap(J,Q=null){return this._fromTexture(J,Q)}compileCubemapShader(){if(this._cubemapMaterial===null)this._cubemapMaterial=RZ(),this._compileMaterial(this._cubemapMaterial)}compileEquirectangularShader(){if(this._equirectMaterial===null)this._equirectMaterial=OZ(),this._compileMaterial(this._equirectMaterial)}dispose(){if(this._dispose(),this._cubemapMaterial!==null)this._cubemapMaterial.dispose();if(this._equirectMaterial!==null)this._equirectMaterial.dispose();if(this._backgroundBox!==null)this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose()}_setSize(J){this._lodMax=Math.floor(Math.log2(J)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){if(this._blurMaterial!==null)this._blurMaterial.dispose();if(this._ggxMaterial!==null)this._ggxMaterial.dispose();if(this._pingPongRenderTarget!==null)this._pingPongRenderTarget.dispose();for(let J=0;J<this._lodMeshes.length;J++)this._lodMeshes[J].geometry.dispose()}_cleanup(J){this._renderer.setRenderTarget(X$,H$,U$),this._renderer.xr.enabled=G$,J.scissorTest=!1,b8(J,0,0,J.width,J.height)}_fromTexture(J,Q){if(J.mapping===T8||J.mapping===i9)this._setSize(J.image.length===0?16:J.image[0].width||J.image[0].image.width);else this._setSize(J.image.width/4);X$=this._renderer.getRenderTarget(),H$=this._renderer.getActiveCubeFace(),U$=this._renderer.getActiveMipmapLevel(),G$=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let $=Q||this._allocateTargets();return this._textureToCubeUV(J,$),this._applyPMREM($),this._cleanup($),$}_allocateTargets(){let J=3*Math.max(this._cubeSize,112),Q=4*this._cubeSize,$={magFilter:xJ,minFilter:xJ,generateMipmaps:!1,type:G9,format:N9,colorSpace:_Q,depthBuffer:!1},W=EZ(J,Q,$);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==J||this._pingPongRenderTarget.height!==Q){if(this._pingPongRenderTarget!==null)this._dispose();this._pingPongRenderTarget=EZ(J,Q,$);let{_lodMax:Z}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=DU(Z)),this._blurMaterial=OU(Z,J,Q),this._ggxMaterial=EU(Z,J,Q)}return W}_compileMaterial(J){let Q=new BJ(new gJ,J);this._renderer.compile(Q,Y7)}_sceneToCubeUV(J,Q,$,W,Z){let X=new dJ(90,1,Q,$),H=[1,-1,1,1,1,1],U=[1,1,1,-1,-1,-1],N=this._renderer,E=N.autoClear,G=N.toneMapping;if(N.getClearColor(DZ),N.toneMapping=W9,N.autoClear=!1,N.state.buffers.depth.getReversed())N.setRenderTarget(W),N.clearDepth(),N.setRenderTarget(null);if(this._backgroundBox===null)this._backgroundBox=new BJ(new x9,new v8({name:"PMREM.Background",side:bJ,depthWrite:!1,depthTest:!1}));let M=this._backgroundBox,I=M.material,F=!1,q=J.background;if(q){if(q.isColor)I.color.copy(q),J.background=null,F=!0}else I.color.copy(DZ),F=!0;for(let A=0;A<6;A++){let j=A%3;if(j===0)X.up.set(0,H[A],0),X.position.set(Z.x,Z.y,Z.z),X.lookAt(Z.x+U[A],Z.y,Z.z);else if(j===1)X.up.set(0,0,H[A]),X.position.set(Z.x,Z.y,Z.z),X.lookAt(Z.x,Z.y+U[A],Z.z);else X.up.set(0,H[A],0),X.position.set(Z.x,Z.y,Z.z),X.lookAt(Z.x,Z.y,Z.z+U[A]);let V=this._cubeSize;if(b8(W,j*V,A>2?V:0,V,V),N.setRenderTarget(W),F)N.render(M,X);N.render(J,X)}N.toneMapping=G,N.autoClear=E,J.background=q}_textureToCubeUV(J,Q){let $=this._renderer,W=J.mapping===T8||J.mapping===i9;if(W){if(this._cubemapMaterial===null)this._cubemapMaterial=RZ();this._cubemapMaterial.uniforms.flipEnvMap.value=J.isRenderTargetTexture===!1?-1:1}else if(this._equirectMaterial===null)this._equirectMaterial=OZ();let Z=W?this._cubemapMaterial:this._equirectMaterial,K=this._lodMeshes[0];K.material=Z;let Y=Z.uniforms;Y.envMap.value=J;let X=this._cubeSize;b8(Q,0,0,3*X,2*X),$.setRenderTarget(Q),$.render(K,Y7)}_applyPMREM(J){let Q=this._renderer,$=Q.autoClear;Q.autoClear=!1;let W=this._lodMeshes.length;for(let Z=1;Z<W;Z++)this._applyGGXFilter(J,Z-1,Z);Q.autoClear=$}_applyGGXFilter(J,Q,$){let W=this._renderer,Z=this._pingPongRenderTarget,K=this._ggxMaterial,Y=this._lodMeshes[$];Y.material=K;let X=K.uniforms,H=$/(this._lodMeshes.length-1),U=Q/(this._lodMeshes.length-1),N=Math.sqrt(H*H-U*U),E=H*1.25,G=N*E,{_lodMax:D}=this,M=this._sizeLods[$],I=3*M*($>D-x8?$-D+x8:0),F=4*(this._cubeSize-M);X.envMap.value=J.texture,X.roughness.value=G,X.mipInt.value=D-Q,b8(Z,I,F,3*M,2*M),W.setRenderTarget(Z),W.render(Y,Y7),X.envMap.value=Z.texture,X.roughness.value=0,X.mipInt.value=D-$,b8(J,I,F,3*M,2*M),W.setRenderTarget(J),W.render(Y,Y7)}_blur(J,Q,$,W){let Z=this._pingPongRenderTarget,K=Math.min(W,Math.PI)/Math.SQRT2;this._blurPass(J,Z,Q,$,K),this._blurPass(Z,J,$,$,K)}_blurPass(J,Q,$,W,Z){let K=this._renderer,Y=this._blurMaterial,X=this._lodMeshes[W];X.material=Y;let H=Y.uniforms;H.envMap.value=J.texture,H.sigma.value=Z,H.mipInt.value=this._lodMax-$;let U=this._sizeLods[W],N=3*U*(W>this._lodMax-x8?W-this._lodMax+x8:0),E=4*(this._cubeSize-U);b8(Q,N,E,3*U,2*U),K.setRenderTarget(Q),K.render(X,Y7)}}function DU(J){let Q=[],$=[],W=J,Z=J-x8+1+GU;for(let K=0;K<Z;K++){let Y=Math.pow(2,W);Q.push(Y);let X=1/(Y-2),H=-X,U=1+X,N=[H,H,U,H,U,U,H,H,U,U,H,U],E=6,G=6,D=3,M=new Float32Array(D*G*E),I=new Float32Array(D*G*E);for(let q=0;q<E;q++){let A=q%3*2/3-1,j=q>2?0:-1,V=[A,j,0,A+0.6666666666666666,j,0,A+0.6666666666666666,j+1,0,A,j,0,A+0.6666666666666666,j+1,0,A,j+1,0];M.set(V,D*G*q);for(let z=0;z<G;z++){let P=N[z*2]*2-1,C=N[z*2+1]*2-1;if(q===0)Y8.set(1,C,P);else if(q===1)Y8.set(-P,1,-C);else if(q===2)Y8.set(-P,C,1);else if(q===3)Y8.set(-1,C,-P);else if(q===4)Y8.set(-P,-1,C);else Y8.set(P,C,-1);Y8.toArray(I,(q*G+z)*D)}}let F=new gJ;if(F.setAttribute("position",new $9(M,D)),F.setAttribute("outputDirection",new $9(I,D)),$.push(new BJ(F,null)),W>x8)W--}return{lodMeshes:$,sizeLods:Q}}function EZ(J,Q,$){let W=new cJ(J,Q,$);return W.texture.mapping=t8,W.texture.name="PMREM.cubeUv",W.scissorTest=!0,W}function b8(J,Q,$,W,Z){J.viewport.set(Q,$,W,Z),J.scissor.set(Q,$,W,Z)}function EU(J,Q,$){return new zJ({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:qU,CUBEUV_TEXEL_WIDTH:1/Q,CUBEUV_TEXEL_HEIGHT:1/$,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:$6(),fragmentShader:`

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
		`,blending:U9,depthTest:!1,depthWrite:!1})}function OU(J,Q,$){return new zJ({name:"SphericalGaussianBlur",defines:{SAMPLES:NU,CUBEUV_TEXEL_WIDTH:1/Q,CUBEUV_TEXEL_HEIGHT:1/$,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:$6(),fragmentShader:`

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
		`,blending:U9,depthTest:!1,depthWrite:!1})}function OZ(){return new zJ({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:$6(),fragmentShader:`

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
		`,blending:U9,depthTest:!1,depthWrite:!1})}function RZ(){return new zJ({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:$6(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:U9,depthTest:!1,depthWrite:!1})}function $6(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}class O$ extends cJ{constructor(J=1,Q={}){super(J,J,Q);this.isWebGLCubeRenderTarget=!0;let $={width:J,height:J,depth:1},W=[$,$,$,$,$,$];this.texture=new i7(W),this._setTextureOptions(Q),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(J,Q){this.texture.type=Q.type,this.texture.colorSpace=Q.colorSpace,this.texture.generateMipmaps=Q.generateMipmaps,this.texture.minFilter=Q.minFilter,this.texture.magFilter=Q.magFilter;let $={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},W=new x9(5,5,5),Z=new zJ({name:"CubemapFromEquirect",uniforms:$8($.uniforms),vertexShader:$.vertexShader,fragmentShader:$.fragmentShader,side:bJ,blending:U9});Z.uniforms.tEquirect.value=Q;let K=new BJ(W,Z),Y=Q.minFilter;if(Q.minFilter===o9)Q.minFilter=xJ;return new Q$(1,10,this).update(J,K),Q.minFilter=Y,K.geometry.dispose(),K.material.dispose(),this}clear(J,Q=!0,$=!0,W=!0){let Z=J.getRenderTarget();for(let K=0;K<6;K++)J.setRenderTarget(this,K),J.clear(Q,$,W);J.setRenderTarget(Z)}}function RU(J){let Q=new WeakMap,$=new WeakMap,W=null;function Z(G,D=!1){if(G===null||G===void 0)return null;if(D)return Y(G);return K(G)}function K(G){if(G&&G.isTexture){let D=G.mapping;if(D===S7||D===j7)if(Q.has(G)){let M=Q.get(G).texture;return X(M,G.mapping)}else{let M=G.image;if(M&&M.height>0){let I=new O$(M.height);return I.fromEquirectangularTexture(J,G),Q.set(G,I),G.addEventListener("dispose",U),X(I.texture,G.mapping)}else return null}}return G}function Y(G){if(G&&G.isTexture){let D=G.mapping,M=D===S7||D===j7,I=D===T8||D===i9;if(M||I){let F=$.get(G),q=F!==void 0?F.texture.pmremVersion:0;if(G.isRenderTargetTexture&&G.pmremVersion!==q){if(W===null)W=new F$(J);return F=M?W.fromEquirectangular(G,F):W.fromCubemap(G,F),F.texture.pmremVersion=G.pmremVersion,$.set(G,F),F.texture}else if(F!==void 0)return F.texture;else{let A=G.image;if(M&&A&&A.height>0||I&&A&&H(A)){if(W===null)W=new F$(J);return F=M?W.fromEquirectangular(G):W.fromCubemap(G),F.texture.pmremVersion=G.pmremVersion,$.set(G,F),G.addEventListener("dispose",N),F.texture}else return null}}}return G}function X(G,D){if(D===S7)G.mapping=T8;else if(D===j7)G.mapping=i9;return G}function H(G){let D=0,M=6;for(let I=0;I<M;I++)if(G[I]!==void 0)D++;return D===M}function U(G){let D=G.target;D.removeEventListener("dispose",U);let M=Q.get(D);if(M!==void 0)Q.delete(D),M.dispose()}function N(G){let D=G.target;D.removeEventListener("dispose",N);let M=$.get(D);if(M!==void 0)$.delete(D),M.dispose()}function E(){if(Q=new WeakMap,$=new WeakMap,W!==null)W.dispose(),W=null}return{get:Z,dispose:E}}function kU(J){let Q={};function $(W){if(Q[W]!==void 0)return Q[W];let Z=J.getExtension(W);return Q[W]=Z,Z}return{has:function(W){return $(W)!==null},init:function(){$("EXT_color_buffer_float"),$("WEBGL_clip_cull_distance"),$("OES_texture_float_linear"),$("EXT_color_buffer_half_float"),$("WEBGL_multisampled_render_to_texture"),$("WEBGL_render_shared_exponent")},get:function(W){let Z=$(W);if(Z===null)s9("WebGLRenderer: "+W+" extension not supported.");return Z}}}function MU(J,Q,$,W){let Z={},K=new WeakMap;function Y(E){let G=E.target;if(G.index!==null)Q.remove(G.index);for(let M in G.attributes)Q.remove(G.attributes[M]);G.removeEventListener("dispose",Y),delete Z[G.id];let D=K.get(G);if(D)Q.remove(D),K.delete(G);if(W.releaseStatesOfGeometry(G),G.isInstancedBufferGeometry===!0)delete G._maxInstanceCount;$.memory.geometries--}function X(E,G){if(Z[G.id]===!0)return G;return G.addEventListener("dispose",Y),Z[G.id]=!0,$.memory.geometries++,G}function H(E){let G=E.attributes;for(let D in G)Q.update(G[D],J.ARRAY_BUFFER)}function U(E){let G=[],D=E.index,M=E.attributes.position,I=0;if(M===void 0)return;if(D!==null){let A=D.array;I=D.version;for(let j=0,V=A.length;j<V;j+=3){let z=A[j+0],P=A[j+1],C=A[j+2];G.push(z,P,P,C,C,z)}}else{let A=M.array;I=M.version;for(let j=0,V=A.length/3-1;j<V;j+=3){let z=j+0,P=j+1,C=j+2;G.push(z,P,P,C,C,z)}}let F=new(M.count>=65535?n7:c7)(G,1);F.version=I;let q=K.get(E);if(q)Q.remove(q);K.set(E,F)}function N(E){let G=K.get(E);if(G){let D=E.index;if(D!==null){if(G.version<D.version)U(E)}}else U(E);return K.get(E)}return{get:X,update:H,getWireframeAttribute:N}}function LU(J,Q,$){let W;function Z(E){W=E}let K,Y;function X(E){K=E.type,Y=E.bytesPerElement}function H(E,G){J.drawElements(W,G,K,E*Y),$.update(G,W,1)}function U(E,G,D){if(D===0)return;J.drawElementsInstanced(W,G,K,E*Y,D),$.update(G,W,D)}function N(E,G,D){if(D===0)return;Q.get("WEBGL_multi_draw").multiDrawElementsWEBGL(W,G,0,K,E,0,D);let I=0;for(let F=0;F<D;F++)I+=G[F];$.update(I,W,1)}this.setMode=Z,this.setIndex=X,this.render=H,this.renderInstances=U,this.renderMultiDraw=N}function VU(J){let Q={geometries:0,textures:0},$={frame:0,calls:0,triangles:0,points:0,lines:0};function W(K,Y,X){switch($.calls++,Y){case J.TRIANGLES:$.triangles+=X*(K/3);break;case J.LINES:$.lines+=X*(K/2);break;case J.LINE_STRIP:$.lines+=X*(K-1);break;case J.LINE_LOOP:$.lines+=X*K;break;case J.POINTS:$.points+=X*K;break;default:S0("WebGLInfo: Unknown draw mode:",Y);break}}function Z(){$.calls=0,$.triangles=0,$.points=0,$.lines=0}return{memory:Q,render:$,programs:null,autoReset:!0,reset:Z,update:W}}function BU(J,Q,$){let W=new WeakMap,Z=new GJ;function K(Y,X,H){let U=Y.morphTargetInfluences,N=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,E=N!==void 0?N.length:0,G=W.get(X);if(G===void 0||G.count!==E){let B=function(){C.dispose(),W.delete(X),X.removeEventListener("dispose",B)};if(G!==void 0)G.texture.dispose();let D=X.morphAttributes.position!==void 0,M=X.morphAttributes.normal!==void 0,I=X.morphAttributes.color!==void 0,F=X.morphAttributes.position||[],q=X.morphAttributes.normal||[],A=X.morphAttributes.color||[],j=0;if(D===!0)j=1;if(M===!0)j=2;if(I===!0)j=3;let V=X.attributes.position.count*j,z=1;if(V>Q.maxTextureSize)z=Math.ceil(V/Q.maxTextureSize),V=Q.maxTextureSize;let P=new Float32Array(V*z*4*E),C=new d7(P,V,z,E);C.type=I9,C.needsUpdate=!0;let k=j*4;for(let g=0;g<E;g++){let f=F[g],h=q[g],a=A[g],_=V*z*4*g;for(let d=0;d<f.count;d++){let o=d*k;if(D===!0)Z.fromBufferAttribute(f,d),P[_+o+0]=Z.x,P[_+o+1]=Z.y,P[_+o+2]=Z.z,P[_+o+3]=0;if(M===!0)Z.fromBufferAttribute(h,d),P[_+o+4]=Z.x,P[_+o+5]=Z.y,P[_+o+6]=Z.z,P[_+o+7]=0;if(I===!0)Z.fromBufferAttribute(a,d),P[_+o+8]=Z.x,P[_+o+9]=Z.y,P[_+o+10]=Z.z,P[_+o+11]=a.itemSize===4?Z.w:1}}G={count:E,texture:C,size:new j0(V,z)},W.set(X,G),X.addEventListener("dispose",B)}if(Y.isInstancedMesh===!0&&Y.morphTexture!==null)H.getUniforms().setValue(J,"morphTexture",Y.morphTexture,$);else{let D=0;for(let I=0;I<U.length;I++)D+=U[I];let M=X.morphTargetsRelative?1:1-D;H.getUniforms().setValue(J,"morphTargetBaseInfluence",M),H.getUniforms().setValue(J,"morphTargetInfluences",U)}H.getUniforms().setValue(J,"morphTargetsTexture",G.texture,$),H.getUniforms().setValue(J,"morphTargetsTextureSize",G.size)}return{update:K}}function IU(J,Q,$,W,Z){let K=new WeakMap;function Y(U){let N=Z.render.frame,E=U.geometry,G=Q.get(U,E);if(K.get(G)!==N)Q.update(G),K.set(G,N);if(U.isInstancedMesh){if(U.hasEventListener("dispose",H)===!1)U.addEventListener("dispose",H);if(K.get(U)!==N){if($.update(U.instanceMatrix,J.ARRAY_BUFFER),U.instanceColor!==null)$.update(U.instanceColor,J.ARRAY_BUFFER);K.set(U,N)}}if(U.isSkinnedMesh){let D=U.skeleton;if(K.get(D)!==N)D.update(),K.set(D,N)}return G}function X(){K=new WeakMap}function H(U){let N=U.target;if(N.removeEventListener("dispose",H),W.releaseStatesOfObject(N),$.remove(N.instanceMatrix),N.instanceColor!==null)$.remove(N.instanceColor)}return{update:Y,dispose:X}}var zU={[g6]:"LINEAR_TONE_MAPPING",[p6]:"REINHARD_TONE_MAPPING",[m6]:"CINEON_TONE_MAPPING",[l6]:"ACES_FILMIC_TONE_MAPPING",[u6]:"AGX_TONE_MAPPING",[c6]:"NEUTRAL_TONE_MAPPING",[d6]:"CUSTOM_TONE_MAPPING"};function AU(J,Q,$,W,Z,K){let Y=new cJ(Q,$,{type:J,depthBuffer:Z,stencilBuffer:K,samples:W?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),X=null,H=null,U=new gJ;U.setAttribute("position",new t0([-1,3,0,-1,-1,0,3,-1,0],3)),U.setAttribute("uv",new t0([0,2,0,0,2,0],2));let N=new lQ({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),E=new BJ(U,N),G=new h8(-1,1,1,-1,0,1),D=null,M=null,I=!1,F,q=null,A=[],j=!1;this.setSize=function(V,z){if(Y.setSize(V,z),X!==null)X.setSize(V,z);if(H!==null)H.setSize(V,z);for(let P=0;P<A.length;P++){let C=A[P];if(C.setSize)C.setSize(V,z)}},this.setEffects=function(V){A=V,j=A.length>0&&A[0].isRenderPass===!0;let{width:z,height:P}=Y;if(A.length>0&&X===null)X=new cJ(z,P,{type:G9,depthBuffer:!1,stencilBuffer:!1}),H=new cJ(z,P,{type:G9,depthBuffer:!1,stencilBuffer:!1});for(let C=0;C<A.length;C++){let k=A[C];if(k.setSize)k.setSize(z,P)}},this.begin=function(V,z){if(I)return!1;if(V.toneMapping===W9&&A.length===0)return!1;if(q=z,z!==null){let{width:P,height:C}=z;if(Y.width!==P||Y.height!==C)this.setSize(P,C)}if(j===!1)V.setRenderTarget(Y);return F=V.toneMapping,V.toneMapping=W9,!0},this.hasRenderPass=function(){return j},this.end=function(V,z){V.toneMapping=F,I=!0;let P=Y,C=X;for(let k=0;k<A.length;k++){let B=A[k];if(B.enabled===!1)continue;if(B.render(V,C,P,z),B.needsSwap!==!1)P=C,C=C===X?H:X}if(D!==V.outputColorSpace||M!==V.toneMapping){if(D=V.outputColorSpace,M=V.toneMapping,N.defines={},m0.getTransfer(D)===$J)N.defines.SRGB_TRANSFER="";let k=zU[M];if(k)N.defines[k]="";N.needsUpdate=!0}N.uniforms.tDiffuse.value=P.texture,V.setRenderTarget(q),V.render(E,G),q=null,I=!1},this.isCompositing=function(){return I},this.dispose=function(){if(Y.dispose(),X!==null)X.dispose();if(H!==null)H.dispose();U.dispose(),N.dispose()}}var bZ=new wJ,D$=new J8(1,1),xZ=new d7,gZ=new xQ,pZ=new i7,kZ=[],MZ=[],LZ=new Float32Array(16),VZ=new Float32Array(9),BZ=new Float32Array(4);function g8(J,Q,$){let W=J[0];if(W<=0||W>0)return J;let Z=Q*$,K=kZ[Z];if(K===void 0)K=new Float32Array(Z),kZ[Z]=K;if(Q!==0){W.toArray(K,0);for(let Y=1,X=0;Y!==Q;++Y)X+=$,J[Y].toArray(K,X)}return K}function RJ(J,Q){if(J.length!==Q.length)return!1;for(let $=0,W=J.length;$<W;$++)if(J[$]!==Q[$])return!1;return!0}function kJ(J,Q){for(let $=0,W=Q.length;$<W;$++)J[$]=Q[$]}function W6(J,Q){let $=MZ[Q];if($===void 0)$=new Int32Array(Q),MZ[Q]=$;for(let W=0;W!==Q;++W)$[W]=J.allocateTextureUnit();return $}function PU(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1f(this.addr,Q),$[0]=Q}function CU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2f(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(RJ($,Q))return;J.uniform2fv(this.addr,Q),kJ($,Q)}}function wU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3f(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else if(Q.r!==void 0){if($[0]!==Q.r||$[1]!==Q.g||$[2]!==Q.b)J.uniform3f(this.addr,Q.r,Q.g,Q.b),$[0]=Q.r,$[1]=Q.g,$[2]=Q.b}else{if(RJ($,Q))return;J.uniform3fv(this.addr,Q),kJ($,Q)}}function _U(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4f(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(RJ($,Q))return;J.uniform4fv(this.addr,Q),kJ($,Q)}}function TU(J,Q){let $=this.cache,W=Q.elements;if(W===void 0){if(RJ($,Q))return;J.uniformMatrix2fv(this.addr,!1,Q),kJ($,Q)}else{if(RJ($,W))return;BZ.set(W),J.uniformMatrix2fv(this.addr,!1,BZ),kJ($,W)}}function SU(J,Q){let $=this.cache,W=Q.elements;if(W===void 0){if(RJ($,Q))return;J.uniformMatrix3fv(this.addr,!1,Q),kJ($,Q)}else{if(RJ($,W))return;VZ.set(W),J.uniformMatrix3fv(this.addr,!1,VZ),kJ($,W)}}function jU(J,Q){let $=this.cache,W=Q.elements;if(W===void 0){if(RJ($,Q))return;J.uniformMatrix4fv(this.addr,!1,Q),kJ($,Q)}else{if(RJ($,W))return;LZ.set(W),J.uniformMatrix4fv(this.addr,!1,LZ),kJ($,W)}}function yU(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1i(this.addr,Q),$[0]=Q}function fU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2i(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(RJ($,Q))return;J.uniform2iv(this.addr,Q),kJ($,Q)}}function vU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3i(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else{if(RJ($,Q))return;J.uniform3iv(this.addr,Q),kJ($,Q)}}function hU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4i(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(RJ($,Q))return;J.uniform4iv(this.addr,Q),kJ($,Q)}}function bU(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1ui(this.addr,Q),$[0]=Q}function xU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2ui(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(RJ($,Q))return;J.uniform2uiv(this.addr,Q),kJ($,Q)}}function gU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3ui(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else{if(RJ($,Q))return;J.uniform3uiv(this.addr,Q),kJ($,Q)}}function pU(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4ui(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(RJ($,Q))return;J.uniform4uiv(this.addr,Q),kJ($,Q)}}function mU(J,Q,$){let W=this.cache,Z=$.allocateTextureUnit();if(W[0]!==Z)J.uniform1i(this.addr,Z),W[0]=Z;let K;if(this.type===J.SAMPLER_2D_SHADOW)D$.compareFunction=$.isReversedDepthBuffer()?l7:m7,K=D$;else K=bZ;$.setTexture2D(Q||K,Z)}function lU(J,Q,$){let W=this.cache,Z=$.allocateTextureUnit();if(W[0]!==Z)J.uniform1i(this.addr,Z),W[0]=Z;$.setTexture3D(Q||gZ,Z)}function dU(J,Q,$){let W=this.cache,Z=$.allocateTextureUnit();if(W[0]!==Z)J.uniform1i(this.addr,Z),W[0]=Z;$.setTextureCube(Q||pZ,Z)}function uU(J,Q,$){let W=this.cache,Z=$.allocateTextureUnit();if(W[0]!==Z)J.uniform1i(this.addr,Z),W[0]=Z;$.setTexture2DArray(Q||xZ,Z)}function cU(J){switch(J){case 5126:return PU;case 35664:return CU;case 35665:return wU;case 35666:return _U;case 35674:return TU;case 35675:return SU;case 35676:return jU;case 5124:case 35670:return yU;case 35667:case 35671:return fU;case 35668:case 35672:return vU;case 35669:case 35673:return hU;case 5125:return bU;case 36294:return xU;case 36295:return gU;case 36296:return pU;case 35678:case 36198:case 36298:case 36306:case 35682:return mU;case 35679:case 36299:case 36307:return lU;case 35680:case 36300:case 36308:case 36293:return dU;case 36289:case 36303:case 36311:case 36292:return uU}}function nU(J,Q){J.uniform1fv(this.addr,Q)}function sU(J,Q){let $=g8(Q,this.size,2);J.uniform2fv(this.addr,$)}function iU(J,Q){let $=g8(Q,this.size,3);J.uniform3fv(this.addr,$)}function oU(J,Q){let $=g8(Q,this.size,4);J.uniform4fv(this.addr,$)}function aU(J,Q){let $=g8(Q,this.size,4);J.uniformMatrix2fv(this.addr,!1,$)}function rU(J,Q){let $=g8(Q,this.size,9);J.uniformMatrix3fv(this.addr,!1,$)}function tU(J,Q){let $=g8(Q,this.size,16);J.uniformMatrix4fv(this.addr,!1,$)}function eU(J,Q){J.uniform1iv(this.addr,Q)}function JG(J,Q){J.uniform2iv(this.addr,Q)}function QG(J,Q){J.uniform3iv(this.addr,Q)}function $G(J,Q){J.uniform4iv(this.addr,Q)}function WG(J,Q){J.uniform1uiv(this.addr,Q)}function ZG(J,Q){J.uniform2uiv(this.addr,Q)}function KG(J,Q){J.uniform3uiv(this.addr,Q)}function YG(J,Q){J.uniform4uiv(this.addr,Q)}function XG(J,Q,$){let W=this.cache,Z=Q.length,K=W6($,Z);if(!RJ(W,K))J.uniform1iv(this.addr,K),kJ(W,K);let Y;if(this.type===J.SAMPLER_2D_SHADOW)Y=D$;else Y=bZ;for(let X=0;X!==Z;++X)$.setTexture2D(Q[X]||Y,K[X])}function HG(J,Q,$){let W=this.cache,Z=Q.length,K=W6($,Z);if(!RJ(W,K))J.uniform1iv(this.addr,K),kJ(W,K);for(let Y=0;Y!==Z;++Y)$.setTexture3D(Q[Y]||gZ,K[Y])}function UG(J,Q,$){let W=this.cache,Z=Q.length,K=W6($,Z);if(!RJ(W,K))J.uniform1iv(this.addr,K),kJ(W,K);for(let Y=0;Y!==Z;++Y)$.setTextureCube(Q[Y]||pZ,K[Y])}function GG(J,Q,$){let W=this.cache,Z=Q.length,K=W6($,Z);if(!RJ(W,K))J.uniform1iv(this.addr,K),kJ(W,K);for(let Y=0;Y!==Z;++Y)$.setTexture2DArray(Q[Y]||xZ,K[Y])}function NG(J){switch(J){case 5126:return nU;case 35664:return sU;case 35665:return iU;case 35666:return oU;case 35674:return aU;case 35675:return rU;case 35676:return tU;case 5124:case 35670:return eU;case 35667:case 35671:return JG;case 35668:case 35672:return QG;case 35669:case 35673:return $G;case 5125:return WG;case 36294:return ZG;case 36295:return KG;case 36296:return YG;case 35678:case 36198:case 36298:case 36306:case 35682:return XG;case 35679:case 36299:case 36307:return HG;case 35680:case 36300:case 36308:case 36293:return UG;case 36289:case 36303:case 36311:case 36292:return GG}}class mZ{constructor(J,Q,$){this.id=J,this.addr=$,this.cache=[],this.type=Q.type,this.setValue=cU(Q.type)}}class lZ{constructor(J,Q,$){this.id=J,this.addr=$,this.cache=[],this.type=Q.type,this.size=Q.size,this.setValue=NG(Q.type)}}class dZ{constructor(J){this.id=J,this.seq=[],this.map={}}setValue(J,Q,$){let W=this.seq;for(let Z=0,K=W.length;Z!==K;++Z){let Y=W[Z];Y.setValue(J,Q[Y.id],$)}}}var N$=/(\w+)(\])?(\[|\.)?/g;function IZ(J,Q){J.seq.push(Q),J.map[Q.id]=Q}function qG(J,Q,$){let W=J.name,Z=W.length;N$.lastIndex=0;while(!0){let K=N$.exec(W),Y=N$.lastIndex,X=K[1],H=K[2]==="]",U=K[3];if(H)X=X|0;if(U===void 0||U==="["&&Y+2===Z){IZ($,U===void 0?new mZ(X,J,Q):new lZ(X,J,Q));break}else{let E=$.map[X];if(E===void 0)E=new dZ(X),IZ($,E);$=E}}}class U7{constructor(J,Q){this.seq=[],this.map={};let $=J.getProgramParameter(Q,J.ACTIVE_UNIFORMS);for(let K=0;K<$;++K){let Y=J.getActiveUniform(Q,K),X=J.getUniformLocation(Q,Y.name);qG(Y,X,this)}let W=[],Z=[];for(let K of this.seq)if(K.type===J.SAMPLER_2D_SHADOW||K.type===J.SAMPLER_CUBE_SHADOW||K.type===J.SAMPLER_2D_ARRAY_SHADOW)W.push(K);else Z.push(K);if(W.length>0)this.seq=W.concat(Z)}setValue(J,Q,$,W){let Z=this.map[Q];if(Z!==void 0)Z.setValue(J,$,W)}setOptional(J,Q,$){let W=Q[$];if(W!==void 0)this.setValue(J,$,W)}static upload(J,Q,$,W){for(let Z=0,K=Q.length;Z!==K;++Z){let Y=Q[Z],X=$[Y.id];if(X.needsUpdate!==!1)Y.setValue(J,X.value,W)}}static seqWithValue(J,Q){let $=[];for(let W=0,Z=J.length;W!==Z;++W){let K=J[W];if(K.id in Q)$.push(K)}return $}}function zZ(J,Q,$){let W=J.createShader(Q);return J.shaderSource(W,$),J.compileShader(W),W}var FG=37297,DG=0;function EG(J,Q){let $=J.split(`
`),W=[],Z=Math.max(Q-6,0),K=Math.min(Q+6,$.length);for(let Y=Z;Y<K;Y++){let X=Y+1;W.push(`${X===Q?">":" "} ${X}: ${$[Y]}`)}return W.join(`
`)}var AZ=new y0;function OG(J){m0._getMatrix(AZ,m0.workingColorSpace,J);let Q=`mat3( ${AZ.elements.map(($)=>$.toFixed(4))} )`;switch(m0.getTransfer(J)){case TQ:return[Q,"LinearTransferOETF"];case $J:return[Q,"sRGBTransferOETF"];default:return w0("WebGLProgram: Unsupported color space: ",J),[Q,"LinearTransferOETF"]}}function PZ(J,Q,$){let W=J.getShaderParameter(Q,J.COMPILE_STATUS),K=(J.getShaderInfoLog(Q)||"").trim();if(W&&K==="")return"";let Y=/ERROR: 0:(\d+)/.exec(K);if(Y){let X=parseInt(Y[1]);return $.toUpperCase()+`

`+K+`

`+EG(J.getShaderSource(Q),X)}else return K}function RG(J,Q){let $=OG(Q);return[`vec4 ${J}( vec4 value ) {`,`	return ${$[1]}( vec4( value.rgb * ${$[0]}, value.a ) );`,"}"].join(`
`)}var kG={[g6]:"Linear",[p6]:"Reinhard",[m6]:"Cineon",[l6]:"ACESFilmic",[u6]:"AgX",[c6]:"Neutral",[d6]:"Custom"};function MG(J,Q){let $=kG[Q];if($===void 0)return w0("WebGLProgram: Unsupported toneMapping:",Q),"vec3 "+J+"( vec3 color ) { return LinearToneMapping( color ); }";return"vec3 "+J+"( vec3 color ) { return "+$+"ToneMapping( color ); }"}var Q6=new v;function LG(){m0.getLuminanceCoefficients(Q6);let J=Q6.x.toFixed(4),Q=Q6.y.toFixed(4),$=Q6.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${J}, ${Q}, ${$} );`,"\treturn dot( weights, rgb );","}"].join(`
`)}function VG(J){return[J.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",J.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(H7).join(`
`)}function BG(J){let Q=[];for(let $ in J){let W=J[$];if(W===!1)continue;Q.push("#define "+$+" "+W)}return Q.join(`
`)}function IG(J,Q){let $={},W=J.getProgramParameter(Q,J.ACTIVE_ATTRIBUTES);for(let Z=0;Z<W;Z++){let K=J.getActiveAttrib(Q,Z),Y=K.name,X=1;if(K.type===J.FLOAT_MAT2)X=2;if(K.type===J.FLOAT_MAT3)X=3;if(K.type===J.FLOAT_MAT4)X=4;$[Y]={type:K.type,location:J.getAttribLocation(Q,Y),locationSize:X}}return $}function H7(J){return J!==""}function CZ(J,Q){let $=Q.numSpotLightShadows+Q.numSpotLightMaps-Q.numSpotLightShadowsWithMaps;return J.replace(/NUM_SUN_LIGHTS/g,Q.numSunLights).replace(/NUM_DIR_LIGHTS/g,Q.numDirLights).replace(/NUM_SPOT_LIGHTS/g,Q.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,Q.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,$).replace(/NUM_RECT_AREA_LIGHTS/g,Q.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,Q.numPointLights).replace(/NUM_HEMI_LIGHTS/g,Q.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,Q.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,Q.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,Q.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,Q.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,Q.numPointLightShadows)}function wZ(J,Q){return J.replace(/NUM_CLIPPING_PLANES/g,Q.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,Q.numClippingPlanes-Q.numClipIntersection)}var zG=/^[ \t]*#include +<([\w\d./]+)>/gm;function E$(J){return J.replace(zG,PG)}var AG=new Map;function PG(J,Q){let $=h0[Q];if($===void 0){let W=AG.get(Q);if(W!==void 0)$=h0[W],w0('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',Q,W);else throw Error("THREE.WebGLProgram: Can not resolve #include <"+Q+">")}return E$($)}var CG=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function _Z(J){return J.replace(CG,wG)}function wG(J,Q,$,W){let Z="";for(let K=parseInt(Q);K<parseInt($);K++)Z+=W.replace(/\[\s*i\s*\]/g,"[ "+K+" ]").replace(/UNROLLED_LOOP_INDEX/g,K);return Z}function TZ(J){let Q=`precision ${J.precision} float;
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
#define LOW_PRECISION`;return Q}var _G={[a8]:"SHADOWMAP_TYPE_PCF",[C8]:"SHADOWMAP_TYPE_VSM"};function TG(J){return _G[J.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var SG={[T8]:"ENVMAP_TYPE_CUBE",[i9]:"ENVMAP_TYPE_CUBE",[t8]:"ENVMAP_TYPE_CUBE_UV"};function jG(J){if(J.envMap===!1)return"ENVMAP_TYPE_CUBE";return SG[J.envMapMode]||"ENVMAP_TYPE_CUBE"}var yG={[i9]:"ENVMAP_MODE_REFRACTION"};function fG(J){if(J.envMap===!1)return"ENVMAP_MODE_REFLECTION";return yG[J.envMapMode]||"ENVMAP_MODE_REFLECTION"}var vG={[xW]:"ENVMAP_BLENDING_MULTIPLY",[gW]:"ENVMAP_BLENDING_MIX",[pW]:"ENVMAP_BLENDING_ADD"};function hG(J){if(J.envMap===!1)return"ENVMAP_BLENDING_NONE";return vG[J.combine]||"ENVMAP_BLENDING_NONE"}function bG(J){let Q=J.envMapCubeUVHeight;if(Q===null)return null;let $=Math.log2(Q)-2,W=1/Q;return{texelWidth:1/(3*Math.max(Math.pow(2,$),112)),texelHeight:W,maxMip:$}}function xG(J,Q,$,W){let Z=J.getContext(),K=$.defines,Y=$.vertexShader,X=$.fragmentShader,H=TG($),U=jG($),N=fG($),E=hG($),G=bG($),D=VG($),M=BG(K),I=Z.createProgram(),F,q,A=$.glslVersion?"#version "+$.glslVersion+`
`:"";if($.isRawShaderMaterial){if(F=["#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,M].filter(H7).join(`
`),F.length>0)F+=`
`;if(q=["#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,M].filter(H7).join(`
`),q.length>0)q+=`
`}else F=[TZ($),"#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,M,$.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",$.batching?"#define USE_BATCHING":"",$.batchingColor?"#define USE_BATCHING_COLOR":"",$.instancing?"#define USE_INSTANCING":"",$.instancingColor?"#define USE_INSTANCING_COLOR":"",$.instancingMorph?"#define USE_INSTANCING_MORPH":"",$.useFog&&$.fog?"#define USE_FOG":"",$.useFog&&$.fogExp2?"#define FOG_EXP2":"",$.map?"#define USE_MAP":"",$.envMap?"#define USE_ENVMAP":"",$.envMap?"#define "+N:"",$.lightMap?"#define USE_LIGHTMAP":"",$.aoMap?"#define USE_AOMAP":"",$.bumpMap?"#define USE_BUMPMAP":"",$.normalMap?"#define USE_NORMALMAP":"",$.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",$.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",$.displacementMap?"#define USE_DISPLACEMENTMAP":"",$.emissiveMap?"#define USE_EMISSIVEMAP":"",$.anisotropy?"#define USE_ANISOTROPY":"",$.anisotropyMap?"#define USE_ANISOTROPYMAP":"",$.clearcoatMap?"#define USE_CLEARCOATMAP":"",$.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",$.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",$.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",$.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",$.specularMap?"#define USE_SPECULARMAP":"",$.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",$.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",$.roughnessMap?"#define USE_ROUGHNESSMAP":"",$.metalnessMap?"#define USE_METALNESSMAP":"",$.alphaMap?"#define USE_ALPHAMAP":"",$.alphaHash?"#define USE_ALPHAHASH":"",$.transmission?"#define USE_TRANSMISSION":"",$.transmissionMap?"#define USE_TRANSMISSIONMAP":"",$.thicknessMap?"#define USE_THICKNESSMAP":"",$.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",$.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",$.mapUv?"#define MAP_UV "+$.mapUv:"",$.alphaMapUv?"#define ALPHAMAP_UV "+$.alphaMapUv:"",$.lightMapUv?"#define LIGHTMAP_UV "+$.lightMapUv:"",$.aoMapUv?"#define AOMAP_UV "+$.aoMapUv:"",$.emissiveMapUv?"#define EMISSIVEMAP_UV "+$.emissiveMapUv:"",$.bumpMapUv?"#define BUMPMAP_UV "+$.bumpMapUv:"",$.normalMapUv?"#define NORMALMAP_UV "+$.normalMapUv:"",$.displacementMapUv?"#define DISPLACEMENTMAP_UV "+$.displacementMapUv:"",$.metalnessMapUv?"#define METALNESSMAP_UV "+$.metalnessMapUv:"",$.roughnessMapUv?"#define ROUGHNESSMAP_UV "+$.roughnessMapUv:"",$.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+$.anisotropyMapUv:"",$.clearcoatMapUv?"#define CLEARCOATMAP_UV "+$.clearcoatMapUv:"",$.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+$.clearcoatNormalMapUv:"",$.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+$.clearcoatRoughnessMapUv:"",$.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+$.iridescenceMapUv:"",$.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+$.iridescenceThicknessMapUv:"",$.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+$.sheenColorMapUv:"",$.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+$.sheenRoughnessMapUv:"",$.specularMapUv?"#define SPECULARMAP_UV "+$.specularMapUv:"",$.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+$.specularColorMapUv:"",$.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+$.specularIntensityMapUv:"",$.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+$.transmissionMapUv:"",$.thicknessMapUv?"#define THICKNESSMAP_UV "+$.thicknessMapUv:"",$.vertexTangents&&$.flatShading===!1?"#define USE_TANGENT":"",$.vertexNormals?"#define HAS_NORMAL":"",$.vertexColors?"#define USE_COLOR":"",$.vertexAlphas?"#define USE_COLOR_ALPHA":"",$.vertexUv1s?"#define USE_UV1":"",$.vertexUv2s?"#define USE_UV2":"",$.vertexUv3s?"#define USE_UV3":"",$.pointsUvs?"#define USE_POINTS_UV":"",$.flatShading?"#define FLAT_SHADED":"",$.skinning?"#define USE_SKINNING":"",$.morphTargets?"#define USE_MORPHTARGETS":"",$.morphNormals&&$.flatShading===!1?"#define USE_MORPHNORMALS":"",$.morphColors?"#define USE_MORPHCOLORS":"",$.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+$.morphTextureStride:"",$.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+$.morphTargetsCount:"",$.doubleSided?"#define DOUBLE_SIDED":"",$.flipSided?"#define FLIP_SIDED":"",$.shadowMapEnabled?"#define USE_SHADOWMAP":"",$.shadowMapEnabled?"#define "+H:"",$.sizeAttenuation?"#define USE_SIZEATTENUATION":"",$.numLightProbes>0?"#define USE_LIGHT_PROBES":"",$.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",$.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","\tattribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","\tattribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","\tuniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","\tattribute vec2 uv1;","#endif","#ifdef USE_UV2","\tattribute vec2 uv2;","#endif","#ifdef USE_UV3","\tattribute vec2 uv3;","#endif","#ifdef USE_TANGENT","\tattribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","\tattribute vec4 color;","#elif defined( USE_COLOR )","\tattribute vec3 color;","#endif","#ifdef USE_SKINNING","\tattribute vec4 skinIndex;","\tattribute vec4 skinWeight;","#endif",`
`].filter(H7).join(`
`),q=[TZ($),"#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,M,$.useFog&&$.fog?"#define USE_FOG":"",$.useFog&&$.fogExp2?"#define FOG_EXP2":"",$.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",$.map?"#define USE_MAP":"",$.matcap?"#define USE_MATCAP":"",$.envMap?"#define USE_ENVMAP":"",$.envMap?"#define "+U:"",$.envMap?"#define "+N:"",$.envMap?"#define "+E:"",G?"#define CUBEUV_TEXEL_WIDTH "+G.texelWidth:"",G?"#define CUBEUV_TEXEL_HEIGHT "+G.texelHeight:"",G?"#define CUBEUV_MAX_MIP "+G.maxMip+".0":"",$.lightMap?"#define USE_LIGHTMAP":"",$.aoMap?"#define USE_AOMAP":"",$.bumpMap?"#define USE_BUMPMAP":"",$.normalMap?"#define USE_NORMALMAP":"",$.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",$.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",$.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",$.emissiveMap?"#define USE_EMISSIVEMAP":"",$.anisotropy?"#define USE_ANISOTROPY":"",$.anisotropyMap?"#define USE_ANISOTROPYMAP":"",$.clearcoat?"#define USE_CLEARCOAT":"",$.clearcoatMap?"#define USE_CLEARCOATMAP":"",$.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",$.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",$.dispersion?"#define USE_DISPERSION":"",$.retroreflection?"#define USE_RETROREFLECTION":"",$.iridescence?"#define USE_IRIDESCENCE":"",$.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",$.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",$.specularMap?"#define USE_SPECULARMAP":"",$.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",$.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",$.roughnessMap?"#define USE_ROUGHNESSMAP":"",$.metalnessMap?"#define USE_METALNESSMAP":"",$.alphaMap?"#define USE_ALPHAMAP":"",$.alphaTest?"#define USE_ALPHATEST":"",$.alphaHash?"#define USE_ALPHAHASH":"",$.sheen?"#define USE_SHEEN":"",$.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",$.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",$.transmission?"#define USE_TRANSMISSION":"",$.transmissionMap?"#define USE_TRANSMISSIONMAP":"",$.thicknessMap?"#define USE_THICKNESSMAP":"",$.vertexTangents&&$.flatShading===!1?"#define USE_TANGENT":"",$.vertexColors||$.instancingColor?"#define USE_COLOR":"",$.vertexAlphas||$.batchingColor?"#define USE_COLOR_ALPHA":"",$.vertexUv1s?"#define USE_UV1":"",$.vertexUv2s?"#define USE_UV2":"",$.vertexUv3s?"#define USE_UV3":"",$.pointsUvs?"#define USE_POINTS_UV":"",$.gradientMap?"#define USE_GRADIENTMAP":"",$.flatShading?"#define FLAT_SHADED":"",$.doubleSided?"#define DOUBLE_SIDED":"",$.flipSided?"#define FLIP_SIDED":"",$.shadowMapEnabled?"#define USE_SHADOWMAP":"",$.shadowMapEnabled?"#define "+H:"",$.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",$.numLightProbes>0?"#define USE_LIGHT_PROBES":"",$.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",$.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",$.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",$.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",$.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",$.toneMapping!==W9?"#define TONE_MAPPING":"",$.toneMapping!==W9?h0.tonemapping_pars_fragment:"",$.toneMapping!==W9?MG("toneMapping",$.toneMapping):"",$.dithering?"#define DITHERING":"",$.opaque?"#define OPAQUE":"",h0.colorspace_pars_fragment,RG("linearToOutputTexel",$.outputColorSpace),LG(),$.useDepthPacking?"#define DEPTH_PACKING "+$.depthPacking:"",`
`].filter(H7).join(`
`);if(Y=E$(Y),Y=CZ(Y,$),Y=wZ(Y,$),X=E$(X),X=CZ(X,$),X=wZ(X,$),Y=_Z(Y),X=_Z(X),$.isRawShaderMaterial!==!0)A=`#version 300 es
`,F=[D,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+F,q=["#define varying in",$.glslVersion===SQ?"":"layout(location = 0) out highp vec4 pc_fragColor;",$.glslVersion===SQ?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+q;let j=A+F+Y,V=A+q+X,z=zZ(Z,Z.VERTEX_SHADER,j),P=zZ(Z,Z.FRAGMENT_SHADER,V);if(Z.attachShader(I,z),Z.attachShader(I,P),$.index0AttributeName!==void 0)Z.bindAttribLocation(I,0,$.index0AttributeName);else if($.hasPositionAttribute===!0)Z.bindAttribLocation(I,0,"position");Z.linkProgram(I);function C(f){if(J.debug.checkShaderErrors){let h=Z.getProgramInfoLog(I)||"",a=Z.getShaderInfoLog(z)||"",_=Z.getShaderInfoLog(P)||"",d=h.trim(),o=a.trim(),p=_.trim(),Q0=!0,c=!0;if(Z.getProgramParameter(I,Z.LINK_STATUS)===!1)if(Q0=!1,typeof J.debug.onShaderError==="function")J.debug.onShaderError(Z,I,z,P);else{let r=PZ(Z,z,"vertex"),J0=PZ(Z,P,"fragment");S0("WebGLProgram: Shader Error "+Z.getError()+" - VALIDATE_STATUS "+Z.getProgramParameter(I,Z.VALIDATE_STATUS)+`

Material Name: `+f.name+`
Material Type: `+f.type+`

Program Info Log: `+d+`
`+r+`
`+J0)}else if(d!=="")w0("WebGLProgram: Program Info Log:",d);else if(o===""||p==="")c=!1;if(c)f.diagnostics={runnable:Q0,programLog:d,vertexShader:{log:o,prefix:F},fragmentShader:{log:p,prefix:q}}}Z.deleteShader(z),Z.deleteShader(P),k=new U7(Z,I),B=IG(Z,I)}let k;this.getUniforms=function(){if(k===void 0)C(this);return k};let B;this.getAttributes=function(){if(B===void 0)C(this);return B};let g=$.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){if(g===!1)g=Z.getProgramParameter(I,FG);return g},this.destroy=function(){W.releaseStatesOfProgram(this),Z.deleteProgram(I),this.program=void 0},this.type=$.shaderType,this.name=$.shaderName,this.id=DG++,this.cacheKey=Q,this.usedTimes=1,this.program=I,this.vertexShader=z,this.fragmentShader=P,this}var gG=0;class uZ{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(J,Q,$){let W=this._getShaderCacheForMaterial(J);if(W.has(Q)===!1)W.add(Q),Q.usedTimes++;if(W.has($)===!1)W.add($),$.usedTimes++;return this}remove(J){let Q=this.materialCache.get(J);for(let $ of Q)if($.usedTimes--,$.usedTimes===0)this.shaderCache.delete($.code);return this.materialCache.delete(J),this}getVertexShaderStage(J){return this._getShaderStage(J.vertexShader)}getFragmentShaderStage(J){return this._getShaderStage(J.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(J){let Q=this.materialCache,$=Q.get(J);if($===void 0)$=new Set,Q.set(J,$);return $}_getShaderStage(J){let Q=this.shaderCache,$=Q.get(J);if($===void 0)$=new cZ(J),Q.set(J,$);return $}}class cZ{constructor(J){this.id=gG++,this.code=J,this.usedTimes=0}}function pG(J){return J===t9||J===g7||J===p7}function mG(J,Q,$,W,Z,K){let Y=new $7,X=new uZ,H=new Set,U=[],N=new Map,E=W.logarithmicDepthBuffer,G=W.precision,D={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function M(k){if(H.add(k),k===0)return"uv";return`uv${k}`}function I(k,B,g,f,h,a){let _=f.fog,d=h.geometry,o=k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial?f.environment:null,p=k.isMeshStandardMaterial||k.isMeshLambertMaterial&&!k.envMap||k.isMeshPhongMaterial&&!k.envMap,Q0=Q.get(k.envMap||o,p),c=!!Q0&&Q0.mapping===t8?Q0.image.height:null,r=D[k.type];if(k.precision!==null){if(G=W.getMaxPrecision(k.precision),G!==k.precision)w0("WebGLProgram.getParameters:",k.precision,"not supported, using",G,"instead.")}let J0=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,_0=J0!==void 0?J0.length:0,z0=0;if(d.morphAttributes.position!==void 0)z0=1;if(d.morphAttributes.normal!==void 0)z0=2;if(d.morphAttributes.color!==void 0)z0=3;let WJ,b0,n,$0;if(r){let ZJ=E9[r];WJ=ZJ.vertexShader,b0=ZJ.fragmentShader}else{WJ=k.vertexShader,b0=k.fragmentShader;let ZJ=X.getVertexShaderStage(k),i0=X.getFragmentShaderStage(k);X.update(k,ZJ,i0),n=ZJ.id,$0=i0.id}let Z0=J.getRenderTarget(),A0=J.state.buffers.depth.getReversed(),T0=h.isInstancedMesh===!0,B0=h.isBatchedMesh===!0,DJ=!!k.map,p0=!!k.matcap,l0=!!Q0,a0=!!k.aoMap,d0=!!k.lightMap,IJ=!!k.bumpMap&&k.wireframe===!1,XJ=!!k.normalMap,vJ=!!k.displacementMap,EJ=!!k.emissiveMap,OJ=!!k.metalnessMap,T=!!k.roughnessMap,hJ=k.anisotropy>0,s0=k.clearcoat>0,UJ=k.dispersion>0,L=k.retroreflectivity>0,O=k.iridescence>0,w=k.sheen>0,m=k.transmission>0,e=hJ&&!!k.anisotropyMap,K0=s0&&!!k.clearcoatMap,H0=s0&&!!k.clearcoatNormalMap,u=s0&&!!k.clearcoatRoughnessMap,i=O&&!!k.iridescenceMap,D0=O&&!!k.iridescenceThicknessMap,V0=w&&!!k.sheenColorMap,U0=w&&!!k.sheenRoughnessMap,W0=!!k.specularMap,I0=!!k.specularColorMap,P0=!!k.specularIntensityMap,c0=m&&!!k.transmissionMap,y=m&&!!k.thicknessMap,Y0=!!k.gradientMap,s=!!k.alphaMap,X0=k.alphaTest>0,E0=!!k.alphaHash,t=!!k.extensions,N0=W9;if(k.toneMapped){if(Z0===null||Z0.isXRRenderTarget===!0)N0=J.toneMapping}let f0={shaderID:r,shaderType:k.type,shaderName:k.name,vertexShader:WJ,fragmentShader:b0,defines:k.defines,customVertexShaderID:n,customFragmentShaderID:$0,isRawShaderMaterial:k.isRawShaderMaterial===!0,glslVersion:k.glslVersion,precision:G,batching:B0,batchingColor:B0&&h._colorsTexture!==null,instancing:T0,instancingColor:T0&&h.instanceColor!==null,instancingMorph:T0&&h.morphTexture!==null,outputColorSpace:Z0===null?J.outputColorSpace:Z0.isXRRenderTarget===!0?Z0.texture.colorSpace:m0.workingColorSpace,alphaToCoverage:!!k.alphaToCoverage,map:DJ,matcap:p0,envMap:l0,envMapMode:l0&&Q0.mapping,envMapCubeUVHeight:c,aoMap:a0,lightMap:d0,bumpMap:IJ,normalMap:XJ,displacementMap:vJ,emissiveMap:EJ,normalMapObjectSpace:XJ&&k.normalMapType===rW,normalMapTangentSpace:XJ&&k.normalMapType===wQ,packedNormalMap:XJ&&k.normalMapType===wQ&&pG(k.normalMap.format),metalnessMap:OJ,roughnessMap:T,anisotropy:hJ,anisotropyMap:e,clearcoat:s0,clearcoatMap:K0,clearcoatNormalMap:H0,clearcoatRoughnessMap:u,dispersion:UJ,retroreflection:L,iridescence:O,iridescenceMap:i,iridescenceThicknessMap:D0,sheen:w,sheenColorMap:V0,sheenRoughnessMap:U0,specularMap:W0,specularColorMap:I0,specularIntensityMap:P0,transmission:m,transmissionMap:c0,thicknessMap:y,gradientMap:Y0,opaque:k.transparent===!1&&k.blending===r8&&k.alphaToCoverage===!1,alphaMap:s,alphaTest:X0,alphaHash:E0,combine:k.combine,mapUv:DJ&&M(k.map.channel),aoMapUv:a0&&M(k.aoMap.channel),lightMapUv:d0&&M(k.lightMap.channel),bumpMapUv:IJ&&M(k.bumpMap.channel),normalMapUv:XJ&&M(k.normalMap.channel),displacementMapUv:vJ&&M(k.displacementMap.channel),emissiveMapUv:EJ&&M(k.emissiveMap.channel),metalnessMapUv:OJ&&M(k.metalnessMap.channel),roughnessMapUv:T&&M(k.roughnessMap.channel),anisotropyMapUv:e&&M(k.anisotropyMap.channel),clearcoatMapUv:K0&&M(k.clearcoatMap.channel),clearcoatNormalMapUv:H0&&M(k.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:u&&M(k.clearcoatRoughnessMap.channel),iridescenceMapUv:i&&M(k.iridescenceMap.channel),iridescenceThicknessMapUv:D0&&M(k.iridescenceThicknessMap.channel),sheenColorMapUv:V0&&M(k.sheenColorMap.channel),sheenRoughnessMapUv:U0&&M(k.sheenRoughnessMap.channel),specularMapUv:W0&&M(k.specularMap.channel),specularColorMapUv:I0&&M(k.specularColorMap.channel),specularIntensityMapUv:P0&&M(k.specularIntensityMap.channel),transmissionMapUv:c0&&M(k.transmissionMap.channel),thicknessMapUv:y&&M(k.thicknessMap.channel),alphaMapUv:s&&M(k.alphaMap.channel),vertexTangents:!!d.attributes.tangent&&(XJ||hJ),vertexNormals:!!d.attributes.normal,vertexColors:k.vertexColors,vertexAlphas:k.vertexColors===!0&&!!d.attributes.color&&d.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!d.attributes.uv&&(DJ||s),fog:!!_,useFog:k.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:k.wireframe===!1&&(k.flatShading===!0||d.attributes.normal===void 0&&XJ===!1&&(k.isMeshLambertMaterial||k.isMeshPhongMaterial||k.isMeshStandardMaterial||k.isMeshPhysicalMaterial)),sizeAttenuation:k.sizeAttenuation===!0,logarithmicDepthBuffer:E,reversedDepthBuffer:A0,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:d.attributes.position!==void 0,morphTargets:d.morphAttributes.position!==void 0,morphNormals:d.morphAttributes.normal!==void 0,morphColors:d.morphAttributes.color!==void 0,morphTargetsCount:_0,morphTextureStride:z0,numSunLights:B.sun.length,numDirLights:B.directional.length,numPointLights:B.point.length,numSpotLights:B.spot.length,numSpotLightMaps:B.spotLightMap.length,numRectAreaLights:B.rectArea.length,numHemiLights:B.hemi.length,numSunLightShadows:B.sunShadowMap.length,numDirLightShadows:B.directionalShadowMap.length,numPointLightShadows:B.pointShadowMap.length,numSpotLightShadows:B.spotShadowMap.length,numSpotLightShadowsWithMaps:B.numSpotLightShadowsWithMaps,numLightProbes:B.numLightProbes,numLightProbeGrids:a.length,numClippingPlanes:K.numPlanes,numClipIntersection:K.numIntersection,dithering:k.dithering,shadowMapEnabled:J.shadowMap.enabled&&g.length>0,shadowMapType:J.shadowMap.type,toneMapping:N0,decodeVideoTexture:DJ&&k.map.isVideoTexture===!0&&m0.getTransfer(k.map.colorSpace)===$J,decodeVideoTextureEmissive:EJ&&k.emissiveMap.isVideoTexture===!0&&m0.getTransfer(k.emissiveMap.colorSpace)===$J,premultipliedAlpha:k.premultipliedAlpha,doubleSided:k.side===uJ,flipSided:k.side===bJ,useDepthPacking:k.depthPacking>=0,depthPacking:k.depthPacking||0,index0AttributeName:k.index0AttributeName,extensionClipCullDistance:t&&k.extensions.clipCullDistance===!0&&$.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(t&&k.extensions.multiDraw===!0||B0)&&$.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:$.has("KHR_parallel_shader_compile"),customProgramCacheKey:k.customProgramCacheKey()};return f0.vertexUv1s=H.has(1),f0.vertexUv2s=H.has(2),f0.vertexUv3s=H.has(3),H.clear(),f0}function F(k){let B=[];if(k.shaderID)B.push(k.shaderID);else B.push(k.customVertexShaderID),B.push(k.customFragmentShaderID);if(k.defines!==void 0)for(let g in k.defines)B.push(g),B.push(k.defines[g]);if(k.isRawShaderMaterial===!1)q(B,k),A(B,k),B.push(J.outputColorSpace);return B.push(k.customProgramCacheKey),B.join()}function q(k,B){k.push(B.precision),k.push(B.outputColorSpace),k.push(B.envMapMode),k.push(B.envMapCubeUVHeight),k.push(B.mapUv),k.push(B.alphaMapUv),k.push(B.lightMapUv),k.push(B.aoMapUv),k.push(B.bumpMapUv),k.push(B.normalMapUv),k.push(B.displacementMapUv),k.push(B.emissiveMapUv),k.push(B.metalnessMapUv),k.push(B.roughnessMapUv),k.push(B.anisotropyMapUv),k.push(B.clearcoatMapUv),k.push(B.clearcoatNormalMapUv),k.push(B.clearcoatRoughnessMapUv),k.push(B.iridescenceMapUv),k.push(B.iridescenceThicknessMapUv),k.push(B.sheenColorMapUv),k.push(B.sheenRoughnessMapUv),k.push(B.specularMapUv),k.push(B.specularColorMapUv),k.push(B.specularIntensityMapUv),k.push(B.transmissionMapUv),k.push(B.thicknessMapUv),k.push(B.combine),k.push(B.fogExp2),k.push(B.sizeAttenuation),k.push(B.morphTargetsCount),k.push(B.morphAttributeCount),k.push(B.numSunLights),k.push(B.numDirLights),k.push(B.numPointLights),k.push(B.numSpotLights),k.push(B.numSpotLightMaps),k.push(B.numHemiLights),k.push(B.numRectAreaLights),k.push(B.numSunLightShadows),k.push(B.numDirLightShadows),k.push(B.numPointLightShadows),k.push(B.numSpotLightShadows),k.push(B.numSpotLightShadowsWithMaps),k.push(B.numLightProbes),k.push(B.shadowMapType),k.push(B.toneMapping),k.push(B.numClippingPlanes),k.push(B.numClipIntersection),k.push(B.depthPacking)}function A(k,B){if(Y.disableAll(),B.instancing)Y.enable(0);if(B.instancingColor)Y.enable(1);if(B.instancingMorph)Y.enable(2);if(B.matcap)Y.enable(3);if(B.envMap)Y.enable(4);if(B.normalMapObjectSpace)Y.enable(5);if(B.normalMapTangentSpace)Y.enable(6);if(B.clearcoat)Y.enable(7);if(B.iridescence)Y.enable(8);if(B.alphaTest)Y.enable(9);if(B.vertexColors)Y.enable(10);if(B.vertexAlphas)Y.enable(11);if(B.vertexUv1s)Y.enable(12);if(B.vertexUv2s)Y.enable(13);if(B.vertexUv3s)Y.enable(14);if(B.vertexTangents)Y.enable(15);if(B.anisotropy)Y.enable(16);if(B.alphaHash)Y.enable(17);if(B.batching)Y.enable(18);if(B.dispersion)Y.enable(19);if(B.retroreflection)Y.enable(24);if(B.batchingColor)Y.enable(20);if(B.gradientMap)Y.enable(21);if(B.packedNormalMap)Y.enable(22);if(B.vertexNormals)Y.enable(23);if(k.push(Y.mask),Y.disableAll(),B.fog)Y.enable(0);if(B.useFog)Y.enable(1);if(B.flatShading)Y.enable(2);if(B.logarithmicDepthBuffer)Y.enable(3);if(B.reversedDepthBuffer)Y.enable(4);if(B.skinning)Y.enable(5);if(B.morphTargets)Y.enable(6);if(B.morphNormals)Y.enable(7);if(B.morphColors)Y.enable(8);if(B.premultipliedAlpha)Y.enable(9);if(B.shadowMapEnabled)Y.enable(10);if(B.doubleSided)Y.enable(11);if(B.flipSided)Y.enable(12);if(B.useDepthPacking)Y.enable(13);if(B.dithering)Y.enable(14);if(B.transmission)Y.enable(15);if(B.sheen)Y.enable(16);if(B.opaque)Y.enable(17);if(B.pointsUvs)Y.enable(18);if(B.decodeVideoTexture)Y.enable(19);if(B.decodeVideoTextureEmissive)Y.enable(20);if(B.alphaToCoverage)Y.enable(21);if(B.numLightProbeGrids>0)Y.enable(22);if(B.hasPositionAttribute)Y.enable(23);k.push(Y.mask)}function j(k){let B=D[k.type],g;if(B){let f=E9[B];g=GZ.clone(f.uniforms)}else g=k.uniforms;return g}function V(k,B){let g=N.get(B);if(g!==void 0)++g.usedTimes;else g=new xG(J,B,k,Z),U.push(g),N.set(B,g);return g}function z(k){if(--k.usedTimes===0){let B=U.indexOf(k);U[B]=U[U.length-1],U.pop(),N.delete(k.cacheKey),k.destroy()}}function P(k){X.remove(k)}function C(){X.dispose()}return{getParameters:I,getProgramCacheKey:F,getUniforms:j,acquireProgram:V,releaseProgram:z,releaseShaderCache:P,programs:U,dispose:C}}function lG(){let J=new WeakMap;function Q(Y){return J.has(Y)}function $(Y){let X=J.get(Y);if(X===void 0)X={},J.set(Y,X);return X}function W(Y){J.delete(Y)}function Z(Y,X,H){J.get(Y)[X]=H}function K(){J=new WeakMap}return{has:Q,get:$,remove:W,update:Z,dispose:K}}function dG(J,Q){if(J.groupOrder!==Q.groupOrder)return J.groupOrder-Q.groupOrder;else if(J.renderOrder!==Q.renderOrder)return J.renderOrder-Q.renderOrder;else if(J.material.id!==Q.material.id)return J.material.id-Q.material.id;else if(J.materialVariant!==Q.materialVariant)return J.materialVariant-Q.materialVariant;else if(J.z!==Q.z)return J.z-Q.z;else return J.id-Q.id}function SZ(J,Q){if(J.groupOrder!==Q.groupOrder)return J.groupOrder-Q.groupOrder;else if(J.renderOrder!==Q.renderOrder)return J.renderOrder-Q.renderOrder;else if(J.z!==Q.z)return Q.z-J.z;else return J.id-Q.id}function jZ(){let J=[],Q=0,$=[],W=[],Z=[];function K(){Q=0,$.length=0,W.length=0,Z.length=0}function Y(G){let D=0;if(G.isInstancedMesh)D+=2;if(G.isSkinnedMesh)D+=1;return D}function X(G,D,M,I,F,q){let A=J[Q];if(A===void 0)A={id:G.id,object:G,geometry:D,material:M,materialVariant:Y(G),groupOrder:I,renderOrder:G.renderOrder,z:F,group:q},J[Q]=A;else A.id=G.id,A.object=G,A.geometry=D,A.material=M,A.materialVariant=Y(G),A.groupOrder=I,A.renderOrder=G.renderOrder,A.z=F,A.group=q;return Q++,A}function H(G,D,M,I,F,q,A){if(A.reversedDepth===!0)F=-F;let j=X(G,D,M,I,F,q);if(M.transmission>0)W.push(j);else if(M.transparent===!0)Z.push(j);else $.push(j)}function U(G,D,M,I,F,q){let A=X(G,D,M,I,F,q);if(M.transmission>0)W.unshift(A);else if(M.transparent===!0)Z.unshift(A);else $.unshift(A)}function N(G,D){if($.length>1)$.sort(G||dG);if(W.length>1)W.sort(D||SZ);if(Z.length>1)Z.sort(D||SZ)}function E(){for(let G=Q,D=J.length;G<D;G++){let M=J[G];if(M.id===null)break;M.id=null,M.object=null,M.geometry=null,M.material=null,M.group=null}}return{opaque:$,transmissive:W,transparent:Z,init:K,push:H,unshift:U,finish:E,sort:N}}function uG(){let J=new WeakMap;function Q(W,Z){let K=J.get(W),Y;if(K===void 0)Y=new jZ,J.set(W,[Y]);else if(Z>=K.length)Y=new jZ,K.push(Y);else Y=K[Z];return Y}function $(){J=new WeakMap}return{get:Q,dispose:$}}function cG(){let J={};return{get:function(Q){if(J[Q.id]!==void 0)return J[Q.id];let $;switch(Q.type){case"SunLight":case"DirectionalLight":$={direction:new v,color:new C0};break;case"SpotLight":$={position:new v,direction:new v,color:new C0,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":$={position:new v,color:new C0,distance:0,decay:0};break;case"HemisphereLight":$={direction:new v,skyColor:new C0,groundColor:new C0};break;case"RectAreaLight":$={color:new C0,position:new v,halfWidth:new v,halfHeight:new v};break}return J[Q.id]=$,$}}}function nG(){let J={};return{get:function(Q){if(J[Q.id]!==void 0)return J[Q.id];let $;switch(Q.type){case"SunLight":case"DirectionalLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new j0};break;case"SpotLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new j0};break;case"PointLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new j0,shadowCameraNear:1,shadowCameraFar:1000};break}return J[Q.id]=$,$}}}var sG=0;function iG(J,Q){return(Q.castShadow?2:0)-(J.castShadow?2:0)+(Q.map?1:0)-(J.map?1:0)}function oG(J){let Q=new cG,$=nG(),W={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let U=0;U<9;U++)W.probe.push(new v);let Z=new v,K=new YJ,Y=new YJ;function X(U){let N=0,E=0,G=0;for(let h=0;h<9;h++)W.probe[h].set(0,0,0);let D=0,M=0,I=0,F=0,q=0,A=0,j=0,V=0,z=0,P=0,C=0,k=0,B=0,g=0;U.sort(iG);for(let h=0,a=U.length;h<a;h++){let _=U[h],d=_.color,o=_.intensity,p=_.distance,Q0=null;if(_.shadow&&_.shadow.map)if(_.shadow.map.texture.format===t9)Q0=_.shadow.map.texture;else Q0=_.shadow.map.depthTexture||_.shadow.map.texture;if(_.isAmbientLight)N+=d.r*o,E+=d.g*o,G+=d.b*o;else if(_.isLightProbe){for(let c=0;c<9;c++)W.probe[c].addScaledVector(_.sh.coefficients[c],o);g++}else if(_.isSunLight){let c=Q.get(_);if(c.color.copy(_.color).multiplyScalar(_.intensity),_.castShadow){let r=_.shadow,J0=$.get(_);J0.shadowIntensity=r.intensity,J0.shadowBias=r.bias,J0.shadowNormalBias=r.normalBias,J0.shadowRadius=r.radius,J0.shadowMapSize.copy(r.mapSize).multiply(r.getFrameExtents()),W.sunShadow[M]=J0,W.sunShadowMap[M]=Q0;let _0=r.getViewportCount();for(let z0=0;z0<_0;z0++)W.sunShadowMatrix[I+z0]=r.getMatrix(z0),W.sunShadowCascade[I+z0]=r._cascadeData[z0];I+=_0,M++}W.sun[D]=c,D++}else if(_.isDirectionalLight){let c=Q.get(_);if(c.color.copy(_.color).multiplyScalar(_.intensity),_.castShadow){let r=_.shadow,J0=$.get(_);J0.shadowIntensity=r.intensity,J0.shadowBias=r.bias,J0.shadowNormalBias=r.normalBias,J0.shadowRadius=r.radius,J0.shadowMapSize=r.mapSize,W.directionalShadow[F]=J0,W.directionalShadowMap[F]=Q0,W.directionalShadowMatrix[F]=_.shadow.matrix,z++}W.directional[F]=c,F++}else if(_.isSpotLight){let c=Q.get(_);c.position.setFromMatrixPosition(_.matrixWorld),c.color.copy(d).multiplyScalar(o),c.distance=p,c.coneCos=Math.cos(_.angle),c.penumbraCos=Math.cos(_.angle*(1-_.penumbra)),c.decay=_.decay,W.spot[A]=c;let r=_.shadow;if(_.map){if(W.spotLightMap[k]=_.map,k++,r.updateMatrices(_),_.castShadow)B++}if(W.spotLightMatrix[A]=r.matrix,_.castShadow){let J0=$.get(_);J0.shadowIntensity=r.intensity,J0.shadowBias=r.bias,J0.shadowNormalBias=r.normalBias,J0.shadowRadius=r.radius,J0.shadowMapSize=r.mapSize,W.spotShadow[A]=J0,W.spotShadowMap[A]=Q0,C++}A++}else if(_.isRectAreaLight){let c=Q.get(_);c.color.copy(d).multiplyScalar(o),c.halfWidth.set(_.width*0.5,0,0),c.halfHeight.set(0,_.height*0.5,0),W.rectArea[j]=c,j++}else if(_.isPointLight){let c=Q.get(_);if(c.color.copy(_.color).multiplyScalar(_.intensity),c.distance=_.distance,c.decay=_.decay,_.castShadow){let r=_.shadow,J0=$.get(_);J0.shadowIntensity=r.intensity,J0.shadowBias=r.bias,J0.shadowNormalBias=r.normalBias,J0.shadowRadius=r.radius,J0.shadowMapSize=r.mapSize,J0.shadowCameraNear=r.camera.near,J0.shadowCameraFar=r.camera.far,W.pointShadow[q]=J0,W.pointShadowMap[q]=Q0,W.pointShadowMatrix[q]=_.shadow.matrix,P++}W.point[q]=c,q++}else if(_.isHemisphereLight){let c=Q.get(_);c.skyColor.copy(_.color).multiplyScalar(o),c.groundColor.copy(_.groundColor).multiplyScalar(o),W.hemi[V]=c,V++}}if(j>0)if(J.has("OES_texture_float_linear")===!0)W.rectAreaLTC1=G0.LTC_FLOAT_1,W.rectAreaLTC2=G0.LTC_FLOAT_2;else W.rectAreaLTC1=G0.LTC_HALF_1,W.rectAreaLTC2=G0.LTC_HALF_2;W.ambient[0]=N,W.ambient[1]=E,W.ambient[2]=G;let f=W.hash;if(f.sunLength!==D||f.directionalLength!==F||f.pointLength!==q||f.spotLength!==A||f.rectAreaLength!==j||f.hemiLength!==V||f.numSunShadows!==M||f.numDirectionalShadows!==z||f.numPointShadows!==P||f.numSpotShadows!==C||f.numSpotMaps!==k||f.numLightProbes!==g)W.sun.length=D,W.directional.length=F,W.spot.length=A,W.rectArea.length=j,W.point.length=q,W.hemi.length=V,W.sunShadow.length=M,W.sunShadowMap.length=M,W.sunShadowMatrix.length=I,W.sunShadowCascade.length=I,W.directionalShadow.length=z,W.directionalShadowMap.length=z,W.directionalShadowMatrix.length=z,W.pointShadow.length=P,W.pointShadowMap.length=P,W.pointShadowMatrix.length=P,W.spotShadow.length=C,W.spotShadowMap.length=C,W.spotLightMatrix.length=C+k-B,W.spotLightMap.length=k,W.numSpotLightShadowsWithMaps=B,W.numLightProbes=g,f.sunLength=D,f.directionalLength=F,f.pointLength=q,f.spotLength=A,f.rectAreaLength=j,f.hemiLength=V,f.numSunShadows=M,f.numDirectionalShadows=z,f.numPointShadows=P,f.numSpotShadows=C,f.numSpotMaps=k,f.numLightProbes=g,W.version=sG++}function H(U,N){let E=0,G=0,D=0,M=0,I=0,F=0,q=N.matrixWorldInverse;for(let A=0,j=U.length;A<j;A++){let V=U[A];if(V.isSunLight){let z=W.sun[E];z.direction.setFromMatrixPosition(V.matrixWorld),z.direction.transformDirection(q),E++}else if(V.isDirectionalLight){let z=W.directional[G];z.direction.setFromMatrixPosition(V.matrixWorld),Z.setFromMatrixPosition(V.target.matrixWorld),z.direction.sub(Z),z.direction.transformDirection(q),G++}else if(V.isSpotLight){let z=W.spot[M];z.position.setFromMatrixPosition(V.matrixWorld),z.position.applyMatrix4(q),z.direction.setFromMatrixPosition(V.matrixWorld),Z.setFromMatrixPosition(V.target.matrixWorld),z.direction.sub(Z),z.direction.transformDirection(q),M++}else if(V.isRectAreaLight){let z=W.rectArea[I];z.position.setFromMatrixPosition(V.matrixWorld),z.position.applyMatrix4(q),Y.identity(),K.copy(V.matrixWorld),K.premultiply(q),Y.extractRotation(K),z.halfWidth.set(V.width*0.5,0,0),z.halfHeight.set(0,V.height*0.5,0),z.halfWidth.applyMatrix4(Y),z.halfHeight.applyMatrix4(Y),I++}else if(V.isPointLight){let z=W.point[D];z.position.setFromMatrixPosition(V.matrixWorld),z.position.applyMatrix4(q),D++}else if(V.isHemisphereLight){let z=W.hemi[F];z.direction.setFromMatrixPosition(V.matrixWorld),z.direction.transformDirection(q),F++}}}return{setup:X,setupView:H,state:W}}function yZ(J){let Q=new oG(J),$=[],W=[],Z=[];function K(G){E.camera=G,$.length=0,W.length=0,Z.length=0}function Y(G){$.push(G)}function X(G){W.push(G)}function H(G){Z.push(G)}function U(){Q.setup($)}function N(G){Q.setupView($,G)}let E={lightsArray:$,shadowsArray:W,lightProbeGridArray:Z,camera:null,lights:Q,transmissionRenderTarget:{},textureUnits:0};return{init:K,state:E,setupLights:U,setupLightsView:N,pushLight:Y,pushShadow:X,pushLightProbeGrid:H}}function aG(J){let Q=new WeakMap;function $(Z,K=0){let Y=Q.get(Z),X;if(Y===void 0)X=new yZ(J),Q.set(Z,[X]);else if(K>=Y.length)X=new yZ(J),Y.push(X);else X=Y[K];return X}function W(){Q=new WeakMap}return{get:$,dispose:W}}var rG=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,tG=`uniform sampler2D shadow_pass;
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
}`,eG=[new v(1,0,0),new v(-1,0,0),new v(0,1,0),new v(0,-1,0),new v(0,0,1),new v(0,0,-1)],JN=[new v(0,-1,0),new v(0,-1,0),new v(0,0,1),new v(0,0,-1),new v(0,-1,0),new v(0,-1,0)],fZ=new YJ,X7=new v,q$=new v;function QN(J,Q,$){let W=new s7,Z=new j0,K=new j0,Y=new GJ,X=new dQ,H=new uQ,U={},N=$.maxTextureSize,E={[w8]:bJ,[bJ]:w8,[uJ]:uJ},G=new zJ({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new j0},radius:{value:4}},vertexShader:rG,fragmentShader:tG}),D=G.clone();D.defines.HORIZONTAL_PASS=1;let M=new gJ;M.setAttribute("position",new $9(new Float32Array([-1,-1,0.5,3,-1,0.5,-1,3,0.5]),3));let I=new BJ(M,G),F=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=a8;let q=this.type;this.render=function(P,C,k){if(F.enabled===!1)return;if(F.autoUpdate===!1&&F.needsUpdate===!1)return;if(P.length===0)return;if(this.type===GW)w0("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=a8;let B=J.getRenderTarget(),g=J.getActiveCubeFace(),f=J.getActiveMipmapLevel(),h=J.state;if(h.setBlending(U9),h.buffers.depth.getReversed()===!0)h.buffers.color.setClear(0,0,0,0);else h.buffers.color.setClear(1,1,1,1);h.buffers.depth.setTest(!0),h.setScissorTest(!1);let a=q!==this.type;if(a)C.traverse(function(_){if(_.material)if(Array.isArray(_.material))_.material.forEach((d)=>d.needsUpdate=!0);else _.material.needsUpdate=!0});for(let _=0,d=P.length;_<d;_++){let o=P[_],p=o.shadow;if(p===void 0){w0("WebGLShadowMap:",o,"has no shadow.");continue}if(p.autoUpdate===!1&&p.needsUpdate===!1)continue;Z.copy(p.mapSize);let Q0=p.getFrameExtents();if(Z.multiply(Q0),K.copy(p.mapSize),Z.x>N||Z.y>N){if(Z.x>N)K.x=Math.floor(N/Q0.x),Z.x=K.x*Q0.x,p.mapSize.x=K.x;if(Z.y>N)K.y=Math.floor(N/Q0.y),Z.y=K.y*Q0.y,p.mapSize.y=K.y}let c=J.state.buffers.depth.getReversed();if(p.camera._reversedDepth=c,p.map===null||a===!0){if(p.map!==null){if(p.map.depthTexture!==null)p.map.depthTexture.dispose(),p.map.depthTexture=null;p.map.dispose()}if(this.type===C8){if(o.isPointLight){w0("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}p.map=new cJ(Z.x,Z.y,{format:t9,type:G9,minFilter:xJ,magFilter:xJ,generateMipmaps:!1}),p.map.texture.name=o.name+".shadowMap",p.map.depthTexture=new J8(Z.x,Z.y,I9),p.map.depthTexture.name=o.name+".shadowMapDepth",p.map.depthTexture.format=a9,p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=h9,p.map.depthTexture.magFilter=h9}else{if(o.isPointLight)p.map=new O$(Z.x),p.map.depthTexture=new pQ(Z.x,b9);else p.map=new cJ(Z.x,Z.y),p.map.depthTexture=new J8(Z.x,Z.y,b9);if(p.map.depthTexture.name=o.name+".shadowMap",p.map.depthTexture.format=a9,this.type===a8)p.map.depthTexture.compareFunction=c?l7:m7,p.map.depthTexture.minFilter=xJ,p.map.depthTexture.magFilter=xJ;else p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=h9,p.map.depthTexture.magFilter=h9}p.camera.updateProjectionMatrix()}if(p.map.isWebGLCubeRenderTarget!==!0&&(p.map.width!==Z.x||p.map.height!==Z.y))p.map.setSize(Z.x,Z.y);let r=p.map.isWebGLCubeRenderTarget?6:p.getViewportCount();if(o.isPointLight!==!0)p.updateMatrices(o,k);for(let J0=0;J0<r;J0++){let _0=p.getCamera(J0);if(o.isPointLight){let{camera:z0,matrix:WJ}=p,b0=o.distance||z0.far;if(b0!==z0.far)z0.far=b0,z0.updateProjectionMatrix();X7.setFromMatrixPosition(o.matrixWorld),z0.position.copy(X7),q$.copy(z0.position),q$.add(eG[J0]),z0.up.copy(JN[J0]),z0.lookAt(q$),z0.updateMatrixWorld(),WJ.makeTranslation(-X7.x,-X7.y,-X7.z),fZ.multiplyMatrices(z0.projectionMatrix,z0.matrixWorldInverse),p._frustum.setFromProjectionMatrix(fZ,z0.coordinateSystem,z0.reversedDepth)}if(p.map.isWebGLCubeRenderTarget)J.setRenderTarget(p.map,J0),J.clear();else{if(J0===0)J.setRenderTarget(p.map),J.clear();let z0=p.getViewport(J0);Y.set(K.x*z0.x,K.y*z0.y,K.x*z0.z,K.y*z0.w),h.viewport(Y)}W=p.getFrustum(J0),V(C,k,_0,o,this.type)}if(p.isPointLightShadow!==!0&&this.type===C8)A(p,k);p.needsUpdate=!1}q=this.type,F.needsUpdate=!1,J.setRenderTarget(B,g,f)};function A(P,C){let k=Q.update(I);if(G.defines.VSM_SAMPLES!==P.blurSamples)G.defines.VSM_SAMPLES=P.blurSamples,D.defines.VSM_SAMPLES=P.blurSamples,G.needsUpdate=!0,D.needsUpdate=!0;if(P.mapPass===null)P.mapPass=new cJ(Z.x,Z.y,{format:t9,type:G9});else if(P.mapPass.width!==P.map.width||P.mapPass.height!==P.map.height)P.mapPass.setSize(P.map.width,P.map.height);G.uniforms.shadow_pass.value=P.map.depthTexture,G.uniforms.resolution.value.set(P.map.width,P.map.height),G.uniforms.radius.value=P.radius,J.setRenderTarget(P.mapPass),J.clear(),J.renderBufferDirect(C,null,k,G,I,null),D.uniforms.shadow_pass.value=P.mapPass.texture,D.uniforms.resolution.value.set(P.map.width,P.map.height),D.uniforms.radius.value=P.radius,J.setRenderTarget(P.map),J.clear(),J.renderBufferDirect(C,null,k,D,I,null)}function j(P,C,k,B){let g=null,f=k.isPointLight===!0?P.customDistanceMaterial:P.customDepthMaterial;if(f!==void 0)g=f;else if(g=k.isPointLight===!0?H:X,J.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0||C.alphaToCoverage===!0){let h=g.uuid,a=C.uuid,_=U[h];if(_===void 0)_={},U[h]=_;let d=_[a];if(d===void 0)d=g.clone(),_[a]=d,C.addEventListener("dispose",z);g=d}if(g.visible=C.visible,g.wireframe=C.wireframe,B===C8)g.side=C.shadowSide!==null?C.shadowSide:C.side;else g.side=C.shadowSide!==null?C.shadowSide:E[C.side];if(g.alphaMap=C.alphaMap,g.alphaTest=C.alphaToCoverage===!0?0.5:C.alphaTest,g.map=C.map,g.clipShadows=C.clipShadows,g.clippingPlanes=C.clippingPlanes,g.clipIntersection=C.clipIntersection,g.displacementMap=C.displacementMap,g.displacementScale=C.displacementScale,g.displacementBias=C.displacementBias,g.wireframeLinewidth=C.wireframeLinewidth,g.linewidth=C.linewidth,k.isPointLight===!0&&g.isMeshDistanceMaterial===!0){let h=J.properties.get(g);h.light=k}return g}function V(P,C,k,B,g){if(P.visible===!1)return;if(P.layers.test(C.layers)&&(P.isMesh||P.isLine||P.isPoints)){if((P.castShadow||P.receiveShadow&&g===C8)&&(!P.frustumCulled||P.intersectsFrustum(W))){P.modelViewMatrix.multiplyMatrices(k.matrixWorldInverse,P.matrixWorld);let a=Q.update(P),_=P.material;if(Array.isArray(_)){let d=a.groups;for(let o=0,p=d.length;o<p;o++){let Q0=d[o],c=_[Q0.materialIndex];if(c&&c.visible){let r=j(P,c,B,g);P.onBeforeShadow(J,P,C,k,a,r,Q0),J.renderBufferDirect(k,null,a,r,P,Q0),P.onAfterShadow(J,P,C,k,a,r,Q0)}}}else if(_.visible){let d=j(P,_,B,g);P.onBeforeShadow(J,P,C,k,a,d,null),J.renderBufferDirect(k,null,a,d,P,null),P.onAfterShadow(J,P,C,k,a,d,null)}}}let h=P.children;for(let a=0,_=h.length;a<_;a++)V(h[a],C,k,B,g)}function z(P){P.target.removeEventListener("dispose",z);for(let k in U){let B=U[k],g=P.target.uuid;if(g in B)B[g].dispose(),delete B[g]}}}function $N(J,Q){function $(){let y=!1,Y0=new GJ,s=null,X0=new GJ(0,0,0,0);return{setMask:function(E0){if(s!==E0&&!y)J.colorMask(E0,E0,E0,E0),s=E0},setLocked:function(E0){y=E0},setClear:function(E0,t,N0,f0,ZJ){if(ZJ===!0)E0*=f0,t*=f0,N0*=f0;if(Y0.set(E0,t,N0,f0),X0.equals(Y0)===!1)J.clearColor(E0,t,N0,f0),X0.copy(Y0)},reset:function(){y=!1,s=null,X0.set(-1,0,0,0)}}}function W(){let y=!1,Y0=!1,s=null,X0=null,E0=null;return{setReversed:function(t){if(Y0!==t){let N0=Q.get("EXT_clip_control");if(t)N0.clipControlEXT(N0.LOWER_LEFT_EXT,N0.ZERO_TO_ONE_EXT);else N0.clipControlEXT(N0.LOWER_LEFT_EXT,N0.NEGATIVE_ONE_TO_ONE_EXT);Y0=t;let f0=E0;E0=null,this.setClear(f0)}},getReversed:function(){return Y0},setTest:function(t){if(t)Z0(J.DEPTH_TEST);else A0(J.DEPTH_TEST)},setMask:function(t){if(s!==t&&!y)J.depthMask(t),s=t},setFunc:function(t){if(Y0)t=HZ[t];if(X0!==t){switch(t){case SW:J.depthFunc(J.NEVER);break;case jW:J.depthFunc(J.ALWAYS);break;case yW:J.depthFunc(J.LESS);break;case x6:J.depthFunc(J.LEQUAL);break;case fW:J.depthFunc(J.EQUAL);break;case vW:J.depthFunc(J.GEQUAL);break;case hW:J.depthFunc(J.GREATER);break;case bW:J.depthFunc(J.NOTEQUAL);break;default:J.depthFunc(J.LEQUAL)}X0=t}},setLocked:function(t){y=t},setClear:function(t){if(E0!==t){if(E0=t,Y0)t=1-t;J.clearDepth(t)}},reset:function(){y=!1,s=null,X0=null,E0=null,Y0=!1}}}function Z(){let y=!1,Y0=null,s=null,X0=null,E0=null,t=null,N0=null,f0=null,ZJ=null;return{setTest:function(i0){if(!y)if(i0)Z0(J.STENCIL_TEST);else A0(J.STENCIL_TEST)},setMask:function(i0){if(Y0!==i0&&!y)J.stencilMask(i0),Y0=i0},setFunc:function(i0,Y9,O9){if(s!==i0||X0!==Y9||E0!==O9)J.stencilFunc(i0,Y9,O9),s=i0,X0=Y9,E0=O9},setOp:function(i0,Y9,O9){if(t!==i0||N0!==Y9||f0!==O9)J.stencilOp(i0,Y9,O9),t=i0,N0=Y9,f0=O9},setLocked:function(i0){y=i0},setClear:function(i0){if(ZJ!==i0)J.clearStencil(i0),ZJ=i0},reset:function(){y=!1,Y0=null,s=null,X0=null,E0=null,t=null,N0=null,f0=null,ZJ=null}}}let K=new $,Y=new W,X=new Z,H=new WeakMap,U=new WeakMap,N={},E={},G={},D=new WeakMap,M=[],I=null,F=!1,q=null,A=null,j=null,V=null,z=null,P=null,C=null,k=new C0(0,0,0),B=0,g=!1,f=null,h=null,a=null,_=null,d=null,o=J.getParameter(J.MAX_COMBINED_TEXTURE_IMAGE_UNITS),p=!1,Q0=0,c=J.getParameter(J.VERSION);if(c.indexOf("WebGL")!==-1)Q0=parseFloat(/^WebGL (\d)/.exec(c)[1]),p=Q0>=1;else if(c.indexOf("OpenGL ES")!==-1)Q0=parseFloat(/^OpenGL ES (\d)/.exec(c)[1]),p=Q0>=2;let r=null,J0={},_0=J.getParameter(J.SCISSOR_BOX),z0=J.getParameter(J.VIEWPORT),WJ=new GJ().fromArray(_0),b0=new GJ().fromArray(z0);function n(y,Y0,s,X0){let E0=new Uint8Array(4),t=J.createTexture();J.bindTexture(y,t),J.texParameteri(y,J.TEXTURE_MIN_FILTER,J.NEAREST),J.texParameteri(y,J.TEXTURE_MAG_FILTER,J.NEAREST);for(let N0=0;N0<s;N0++)if(y===J.TEXTURE_3D||y===J.TEXTURE_2D_ARRAY)J.texImage3D(Y0,0,J.RGBA,1,1,X0,0,J.RGBA,J.UNSIGNED_BYTE,E0);else J.texImage2D(Y0+N0,0,J.RGBA,1,1,0,J.RGBA,J.UNSIGNED_BYTE,E0);return t}let $0={};$0[J.TEXTURE_2D]=n(J.TEXTURE_2D,J.TEXTURE_2D,1),$0[J.TEXTURE_CUBE_MAP]=n(J.TEXTURE_CUBE_MAP,J.TEXTURE_CUBE_MAP_POSITIVE_X,6),$0[J.TEXTURE_2D_ARRAY]=n(J.TEXTURE_2D_ARRAY,J.TEXTURE_2D_ARRAY,1,1),$0[J.TEXTURE_3D]=n(J.TEXTURE_3D,J.TEXTURE_3D,1,1),K.setClear(0,0,0,1),Y.setClear(1),X.setClear(0),Z0(J.DEPTH_TEST),Y.setFunc(x6),IJ(!1),XJ(f6),Z0(J.CULL_FACE),a0(U9);function Z0(y){if(N[y]!==!0)J.enable(y),N[y]=!0}function A0(y){if(N[y]!==!1)J.disable(y),N[y]=!1}function T0(y,Y0){if(G[y]!==Y0){if(J.bindFramebuffer(y,Y0),G[y]=Y0,y===J.DRAW_FRAMEBUFFER)G[J.FRAMEBUFFER]=Y0;if(y===J.FRAMEBUFFER)G[J.DRAW_FRAMEBUFFER]=Y0;return!0}return!1}function B0(y,Y0){let s=M,X0=!1;if(y){if(s=D.get(Y0),s===void 0)s=[],D.set(Y0,s);let E0=y.textures;if(s.length!==E0.length||s[0]!==J.COLOR_ATTACHMENT0){for(let t=0,N0=E0.length;t<N0;t++)s[t]=J.COLOR_ATTACHMENT0+t;s.length=E0.length,X0=!0}}else if(s[0]!==J.BACK)s[0]=J.BACK,X0=!0;if(X0)J.drawBuffers(s)}function DJ(y){if(I!==y)return J.useProgram(y),I=y,!0;return!1}let p0={[_8]:J.FUNC_ADD,[qW]:J.FUNC_SUBTRACT,[FW]:J.FUNC_REVERSE_SUBTRACT};p0[DW]=J.MIN,p0[EW]=J.MAX;let l0={[OW]:J.ZERO,[RW]:J.ONE,[kW]:J.SRC_COLOR,[LW]:J.SRC_ALPHA,[PW]:J.SRC_ALPHA_SATURATE,[zW]:J.DST_COLOR,[BW]:J.DST_ALPHA,[MW]:J.ONE_MINUS_SRC_COLOR,[VW]:J.ONE_MINUS_SRC_ALPHA,[AW]:J.ONE_MINUS_DST_COLOR,[IW]:J.ONE_MINUS_DST_ALPHA,[CW]:J.CONSTANT_COLOR,[wW]:J.ONE_MINUS_CONSTANT_COLOR,[_W]:J.CONSTANT_ALPHA,[TW]:J.ONE_MINUS_CONSTANT_ALPHA};function a0(y,Y0,s,X0,E0,t,N0,f0,ZJ,i0){if(y===U9){if(F===!0)A0(J.BLEND),F=!1;return}if(F===!1)Z0(J.BLEND),F=!0;if(y!==NW){if(y!==q||i0!==g){if(A!==_8||z!==_8)J.blendEquation(J.FUNC_ADD),A=_8,z=_8;if(i0)switch(y){case r8:J.blendFuncSeparate(J.ONE,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case v6:J.blendFunc(J.ONE,J.ONE);break;case h6:J.blendFuncSeparate(J.ZERO,J.ONE_MINUS_SRC_COLOR,J.ZERO,J.ONE);break;case b6:J.blendFuncSeparate(J.DST_COLOR,J.ONE_MINUS_SRC_ALPHA,J.ZERO,J.ONE);break;default:S0("WebGLState: Invalid blending: ",y);break}else switch(y){case r8:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case v6:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE,J.ONE,J.ONE);break;case h6:S0("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case b6:S0("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:S0("WebGLState: Invalid blending: ",y);break}j=null,V=null,P=null,C=null,k.set(0,0,0),B=0,q=y,g=i0}return}if(E0=E0||Y0,t=t||s,N0=N0||X0,Y0!==A||E0!==z)J.blendEquationSeparate(p0[Y0],p0[E0]),A=Y0,z=E0;if(s!==j||X0!==V||t!==P||N0!==C)J.blendFuncSeparate(l0[s],l0[X0],l0[t],l0[N0]),j=s,V=X0,P=t,C=N0;if(f0.equals(k)===!1||ZJ!==B)J.blendColor(f0.r,f0.g,f0.b,ZJ),k.copy(f0),B=ZJ;q=y,g=!1}function d0(y,Y0){y.side===uJ?A0(J.CULL_FACE):Z0(J.CULL_FACE);let s=y.side===bJ;if(Y0)s=!s;IJ(s),y.blending===r8&&y.transparent===!1?a0(U9):a0(y.blending,y.blendEquation,y.blendSrc,y.blendDst,y.blendEquationAlpha,y.blendSrcAlpha,y.blendDstAlpha,y.blendColor,y.blendAlpha,y.premultipliedAlpha),Y.setFunc(y.depthFunc),Y.setTest(y.depthTest),Y.setMask(y.depthWrite),K.setMask(y.colorWrite);let X0=y.stencilWrite;if(X.setTest(X0),X0)X.setMask(y.stencilWriteMask),X.setFunc(y.stencilFunc,y.stencilRef,y.stencilFuncMask),X.setOp(y.stencilFail,y.stencilZFail,y.stencilZPass);EJ(y.polygonOffset,y.polygonOffsetFactor,y.polygonOffsetUnits),y.alphaToCoverage===!0?Z0(J.SAMPLE_ALPHA_TO_COVERAGE):A0(J.SAMPLE_ALPHA_TO_COVERAGE)}function IJ(y){if(f!==y){if(y)J.frontFace(J.CW);else J.frontFace(J.CCW);f=y}}function XJ(y){if(y!==HW){if(Z0(J.CULL_FACE),y!==h)if(y===f6)J.cullFace(J.BACK);else if(y===UW)J.cullFace(J.FRONT);else J.cullFace(J.FRONT_AND_BACK)}else A0(J.CULL_FACE);h=y}function vJ(y){if(y!==a){if(p)J.lineWidth(y);a=y}}function EJ(y,Y0,s){if(y){if(Z0(J.POLYGON_OFFSET_FILL),_!==Y0||d!==s){if(_=Y0,d=s,Y.getReversed())Y0=-Y0;J.polygonOffset(Y0,s)}}else A0(J.POLYGON_OFFSET_FILL)}function OJ(y){if(y)Z0(J.SCISSOR_TEST);else A0(J.SCISSOR_TEST)}function T(y){if(y===void 0)y=J.TEXTURE0+o-1;if(r!==y)J.activeTexture(y),r=y}function hJ(y,Y0,s){if(s===void 0)if(r===null)s=J.TEXTURE0+o-1;else s=r;let X0=J0[s];if(X0===void 0)X0={type:void 0,texture:void 0},J0[s]=X0;if(X0.type!==y||X0.texture!==Y0){if(r!==s)J.activeTexture(s),r=s;J.bindTexture(y,Y0||$0[y]),X0.type=y,X0.texture=Y0}}function s0(){let y=J0[r];if(y!==void 0&&y.type!==void 0)J.bindTexture(y.type,null),y.type=void 0,y.texture=void 0}function UJ(){try{J.compressedTexImage2D(...arguments)}catch(y){S0("WebGLState:",y)}}function L(){try{J.compressedTexImage3D(...arguments)}catch(y){S0("WebGLState:",y)}}function O(){try{J.texSubImage2D(...arguments)}catch(y){S0("WebGLState:",y)}}function w(){try{J.texSubImage3D(...arguments)}catch(y){S0("WebGLState:",y)}}function m(){try{J.compressedTexSubImage2D(...arguments)}catch(y){S0("WebGLState:",y)}}function e(){try{J.compressedTexSubImage3D(...arguments)}catch(y){S0("WebGLState:",y)}}function K0(){try{J.texStorage2D(...arguments)}catch(y){S0("WebGLState:",y)}}function H0(){try{J.texStorage3D(...arguments)}catch(y){S0("WebGLState:",y)}}function u(){try{J.texImage2D(...arguments)}catch(y){S0("WebGLState:",y)}}function i(){try{J.texImage3D(...arguments)}catch(y){S0("WebGLState:",y)}}function D0(y){if(E[y]!==void 0)return E[y];else return J.getParameter(y)}function V0(y,Y0){if(E[y]!==Y0)J.pixelStorei(y,Y0),E[y]=Y0}function U0(y){if(WJ.equals(y)===!1)J.scissor(y.x,y.y,y.z,y.w),WJ.copy(y)}function W0(y){if(b0.equals(y)===!1)J.viewport(y.x,y.y,y.z,y.w),b0.copy(y)}function I0(y,Y0){let s=U.get(Y0);if(s===void 0)s=new WeakMap,U.set(Y0,s);let X0=s.get(y);if(X0===void 0)X0=J.getUniformBlockIndex(Y0,y.name),s.set(y,X0)}function P0(y,Y0){let X0=U.get(Y0).get(y);if(H.get(Y0)!==X0)J.uniformBlockBinding(Y0,X0,y.__bindingPointIndex),H.set(Y0,X0)}function c0(){J.disable(J.BLEND),J.disable(J.CULL_FACE),J.disable(J.DEPTH_TEST),J.disable(J.POLYGON_OFFSET_FILL),J.disable(J.SCISSOR_TEST),J.disable(J.STENCIL_TEST),J.disable(J.SAMPLE_ALPHA_TO_COVERAGE),J.blendEquation(J.FUNC_ADD),J.blendFunc(J.ONE,J.ZERO),J.blendFuncSeparate(J.ONE,J.ZERO,J.ONE,J.ZERO),J.blendColor(0,0,0,0),J.colorMask(!0,!0,!0,!0),J.clearColor(0,0,0,0),J.depthMask(!0),J.depthFunc(J.LESS),Y.setReversed(!1),J.clearDepth(1),J.stencilMask(4294967295),J.stencilFunc(J.ALWAYS,0,4294967295),J.stencilOp(J.KEEP,J.KEEP,J.KEEP),J.clearStencil(0),J.cullFace(J.BACK),J.frontFace(J.CCW),J.polygonOffset(0,0),J.activeTexture(J.TEXTURE0),J.bindFramebuffer(J.FRAMEBUFFER,null),J.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),J.bindFramebuffer(J.READ_FRAMEBUFFER,null),J.useProgram(null),J.lineWidth(1),J.scissor(0,0,J.canvas.width,J.canvas.height),J.viewport(0,0,J.canvas.width,J.canvas.height),J.pixelStorei(J.PACK_ALIGNMENT,4),J.pixelStorei(J.UNPACK_ALIGNMENT,4),J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,!1),J.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),J.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,J.BROWSER_DEFAULT_WEBGL),J.pixelStorei(J.PACK_ROW_LENGTH,0),J.pixelStorei(J.PACK_SKIP_PIXELS,0),J.pixelStorei(J.PACK_SKIP_ROWS,0),J.pixelStorei(J.UNPACK_ROW_LENGTH,0),J.pixelStorei(J.UNPACK_IMAGE_HEIGHT,0),J.pixelStorei(J.UNPACK_SKIP_PIXELS,0),J.pixelStorei(J.UNPACK_SKIP_ROWS,0),J.pixelStorei(J.UNPACK_SKIP_IMAGES,0),N={},E={},r=null,J0={},G={},D=new WeakMap,M=[],I=null,F=!1,q=null,A=null,j=null,V=null,z=null,P=null,C=null,k=new C0(0,0,0),B=0,g=!1,f=null,h=null,a=null,_=null,d=null,WJ.set(0,0,J.canvas.width,J.canvas.height),b0.set(0,0,J.canvas.width,J.canvas.height),K.reset(),Y.reset(),X.reset()}return{buffers:{color:K,depth:Y,stencil:X},enable:Z0,disable:A0,bindFramebuffer:T0,drawBuffers:B0,useProgram:DJ,setBlending:a0,setMaterial:d0,setFlipSided:IJ,setCullFace:XJ,setLineWidth:vJ,setPolygonOffset:EJ,setScissorTest:OJ,activeTexture:T,bindTexture:hJ,unbindTexture:s0,compressedTexImage2D:UJ,compressedTexImage3D:L,texImage2D:u,texImage3D:i,pixelStorei:V0,getParameter:D0,updateUBOMapping:I0,uniformBlockBinding:P0,texStorage2D:K0,texStorage3D:H0,texSubImage2D:O,texSubImage3D:w,compressedTexSubImage2D:m,compressedTexSubImage3D:e,scissor:U0,viewport:W0,reset:c0}}function WN(J,Q,$,W,Z,K,Y){let X=Q.has("WEBGL_multisampled_render_to_texture")?Q.get("WEBGL_multisampled_render_to_texture"):null,H=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),U=new j0,N=new WeakMap,E=new Set,G,D=new WeakMap,M=!1;try{M=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(L){}function I(L,O){return M?new OffscreenCanvas(L,O):o8("canvas")}function F(L,O,w){let m=1,e=UJ(L);if(e.width>w||e.height>w)m=w/Math.max(e.width,e.height);if(m<1)if(typeof HTMLImageElement<"u"&&L instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&L instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&L instanceof ImageBitmap||typeof VideoFrame<"u"&&L instanceof VideoFrame){let K0=Math.floor(m*e.width),H0=Math.floor(m*e.height);if(G===void 0)G=I(K0,H0);let u=O?I(K0,H0):G;return u.width=K0,u.height=H0,u.getContext("2d").drawImage(L,0,0,K0,H0),w0("WebGLRenderer: Texture has been resized from ("+e.width+"x"+e.height+") to ("+K0+"x"+H0+")."),u}else{if("data"in L)w0("WebGLRenderer: Image in DataTexture is too big ("+e.width+"x"+e.height+").");return L}return L}function q(L){return L.generateMipmaps}function A(L){J.generateMipmap(L)}function j(L){if(L.isWebGLCubeRenderTarget)return J.TEXTURE_CUBE_MAP;if(L.isWebGL3DRenderTarget)return J.TEXTURE_3D;if(L.isWebGLArrayRenderTarget||L.isCompressedArrayTexture)return J.TEXTURE_2D_ARRAY;return J.TEXTURE_2D}function V(L,O,w,m,e,K0=!1){if(L!==null){if(J[L]!==void 0)return J[L];w0("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+L+"'")}let H0;if(m){if(H0=Q.get("EXT_texture_norm16"),!H0)w0("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension")}let u=O;if(O===J.RED){if(w===J.FLOAT)u=J.R32F;if(w===J.HALF_FLOAT)u=J.R16F;if(w===J.UNSIGNED_BYTE)u=J.R8;if(w===J.UNSIGNED_SHORT&&H0)u=H0.R16_EXT;if(w===J.SHORT&&H0)u=H0.R16_SNORM_EXT}if(O===J.RED_INTEGER){if(w===J.UNSIGNED_BYTE)u=J.R8UI;if(w===J.UNSIGNED_SHORT)u=J.R16UI;if(w===J.UNSIGNED_INT)u=J.R32UI;if(w===J.BYTE)u=J.R8I;if(w===J.SHORT)u=J.R16I;if(w===J.INT)u=J.R32I}if(O===J.RG){if(w===J.FLOAT)u=J.RG32F;if(w===J.HALF_FLOAT)u=J.RG16F;if(w===J.UNSIGNED_BYTE)u=J.RG8;if(w===J.UNSIGNED_SHORT&&H0)u=H0.RG16_EXT;if(w===J.SHORT&&H0)u=H0.RG16_SNORM_EXT}if(O===J.RG_INTEGER){if(w===J.UNSIGNED_BYTE)u=J.RG8UI;if(w===J.UNSIGNED_SHORT)u=J.RG16UI;if(w===J.UNSIGNED_INT)u=J.RG32UI;if(w===J.BYTE)u=J.RG8I;if(w===J.SHORT)u=J.RG16I;if(w===J.INT)u=J.RG32I}if(O===J.RGB_INTEGER){if(w===J.UNSIGNED_BYTE)u=J.RGB8UI;if(w===J.UNSIGNED_SHORT)u=J.RGB16UI;if(w===J.UNSIGNED_INT)u=J.RGB32UI;if(w===J.BYTE)u=J.RGB8I;if(w===J.SHORT)u=J.RGB16I;if(w===J.INT)u=J.RGB32I}if(O===J.RGBA_INTEGER){if(w===J.UNSIGNED_BYTE)u=J.RGBA8UI;if(w===J.UNSIGNED_SHORT)u=J.RGBA16UI;if(w===J.UNSIGNED_INT)u=J.RGBA32UI;if(w===J.BYTE)u=J.RGBA8I;if(w===J.SHORT)u=J.RGBA16I;if(w===J.INT)u=J.RGBA32I}if(O===J.RGB){if(w===J.UNSIGNED_SHORT&&H0)u=H0.RGB16_EXT;if(w===J.SHORT&&H0)u=H0.RGB16_SNORM_EXT;if(w===J.UNSIGNED_INT_5_9_9_9_REV)u=J.RGB9_E5;if(w===J.UNSIGNED_INT_10F_11F_11F_REV)u=J.R11F_G11F_B10F}if(O===J.RGBA){let i=K0?TQ:m0.getTransfer(e);if(w===J.FLOAT)u=J.RGBA32F;if(w===J.HALF_FLOAT)u=J.RGBA16F;if(w===J.UNSIGNED_BYTE)u=i===$J?J.SRGB8_ALPHA8:J.RGBA8;if(w===J.UNSIGNED_SHORT&&H0)u=H0.RGBA16_EXT;if(w===J.SHORT&&H0)u=H0.RGBA16_SNORM_EXT;if(w===J.UNSIGNED_SHORT_4_4_4_4)u=J.RGBA4;if(w===J.UNSIGNED_SHORT_5_5_5_1)u=J.RGB5_A1}if(u===J.R16F||u===J.R32F||u===J.RG16F||u===J.RG32F||u===J.RGBA16F||u===J.RGBA32F)Q.get("EXT_color_buffer_float");return u}function z(L,O){let w;if(L){if(O===null||O===b9||O===S8)w=J.DEPTH24_STENCIL8;else if(O===I9)w=J.DEPTH32F_STENCIL8;else if(O===J7)w=J.DEPTH24_STENCIL8,w0("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")}else if(O===null||O===b9||O===S8)w=J.DEPTH_COMPONENT24;else if(O===I9)w=J.DEPTH_COMPONENT32F;else if(O===J7)w=J.DEPTH_COMPONENT16;return w}function P(L,O){if(q(L)===!0||L.isFramebufferTexture&&L.minFilter!==h9&&L.minFilter!==xJ)return Math.log2(Math.max(O.width,O.height))+1;else if(L.mipmaps!==void 0&&L.mipmaps.length>0)return L.mipmaps.length;else if(L.isCompressedTexture&&Array.isArray(L.image))return O.mipmaps.length;else return 1}function C(L){let O=L.target;if(O.removeEventListener("dispose",C),B(O),O.isVideoTexture)N.delete(O);if(O.isHTMLTexture)E.delete(O)}function k(L){let O=L.target;O.removeEventListener("dispose",k),f(O)}function B(L){let O=W.get(L);if(O.__webglInit===void 0)return;let w=L.source,m=D.get(w);if(m){let e=m[O.__cacheKey];if(e.usedTimes--,e.usedTimes===0)g(L);if(Object.keys(m).length===0)D.delete(w)}W.remove(L)}function g(L){let O=W.get(L);J.deleteTexture(O.__webglTexture);let w=L.source,m=D.get(w);delete m[O.__cacheKey],Y.memory.textures--}function f(L){let O=W.get(L);if(L.depthTexture)L.depthTexture.dispose(),W.remove(L.depthTexture);if(L.isWebGLCubeRenderTarget)for(let m=0;m<6;m++){if(Array.isArray(O.__webglFramebuffer[m]))for(let e=0;e<O.__webglFramebuffer[m].length;e++)J.deleteFramebuffer(O.__webglFramebuffer[m][e]);else J.deleteFramebuffer(O.__webglFramebuffer[m]);if(O.__webglDepthbuffer)J.deleteRenderbuffer(O.__webglDepthbuffer[m])}else{if(Array.isArray(O.__webglFramebuffer))for(let m=0;m<O.__webglFramebuffer.length;m++)J.deleteFramebuffer(O.__webglFramebuffer[m]);else J.deleteFramebuffer(O.__webglFramebuffer);if(O.__webglDepthbuffer)J.deleteRenderbuffer(O.__webglDepthbuffer);if(O.__webglMultisampledFramebuffer)J.deleteFramebuffer(O.__webglMultisampledFramebuffer);if(O.__webglColorRenderbuffer){for(let m=0;m<O.__webglColorRenderbuffer.length;m++)if(O.__webglColorRenderbuffer[m])J.deleteRenderbuffer(O.__webglColorRenderbuffer[m])}if(O.__webglDepthRenderbuffer)J.deleteRenderbuffer(O.__webglDepthRenderbuffer)}let w=L.textures;for(let m=0,e=w.length;m<e;m++){let K0=W.get(w[m]);if(K0.__webglTexture)J.deleteTexture(K0.__webglTexture),Y.memory.textures--;W.remove(w[m])}W.remove(L)}let h=0;function a(){h=0}function _(){return h}function d(L){h=L}function o(){let L=h;if(L>=Z.maxTextures)w0("WebGLTextures: Trying to use "+(L+1)+" texture units while this GPU supports only "+Z.maxTextures);return h+=1,L}function p(L){let O=[];return O.push(L.wrapS),O.push(L.wrapT),O.push(L.wrapR||0),O.push(L.magFilter),O.push(L.minFilter),O.push(L.anisotropy),O.push(L.internalFormat),O.push(L.format),O.push(L.type),O.push(L.generateMipmaps),O.push(L.premultiplyAlpha),O.push(L.flipY),O.push(L.unpackAlignment),O.push(L.colorSpace),O.join()}function Q0(L,O){let w=W.get(L);if(L.isVideoTexture)hJ(L);if(L.isRenderTargetTexture===!1&&L.isExternalTexture!==!0&&L.version>0&&w.__version!==L.version){let m=L.image;if(m===null)w0("WebGLRenderer: Texture marked for update but no image data found.");else if(m.complete===!1)w0("WebGLRenderer: Texture marked for update but image is incomplete");else{A0(w,L,O);return}}else if(L.isExternalTexture)w.__webglTexture=L.sourceTexture?L.sourceTexture:null;$.bindTexture(J.TEXTURE_2D,w.__webglTexture,J.TEXTURE0+O)}function c(L,O){let w=W.get(L);if(L.isRenderTargetTexture===!1&&L.version>0&&w.__version!==L.version){A0(w,L,O);return}else if(L.isExternalTexture)w.__webglTexture=L.sourceTexture?L.sourceTexture:null;$.bindTexture(J.TEXTURE_2D_ARRAY,w.__webglTexture,J.TEXTURE0+O)}function r(L,O){let w=W.get(L);if(L.isRenderTargetTexture===!1&&L.version>0&&w.__version!==L.version){A0(w,L,O);return}$.bindTexture(J.TEXTURE_3D,w.__webglTexture,J.TEXTURE0+O)}function J0(L,O){let w=W.get(L);if(L.isCubeDepthTexture!==!0&&L.version>0&&w.__version!==L.version){T0(w,L,O);return}$.bindTexture(J.TEXTURE_CUBE_MAP,w.__webglTexture,J.TEXTURE0+O)}let _0={[mW]:J.REPEAT,[y7]:J.CLAMP_TO_EDGE,[lW]:J.MIRRORED_REPEAT},z0={[h9]:J.NEAREST,[dW]:J.NEAREST_MIPMAP_NEAREST,[e8]:J.NEAREST_MIPMAP_LINEAR,[xJ]:J.LINEAR,[f7]:J.LINEAR_MIPMAP_NEAREST,[o9]:J.LINEAR_MIPMAP_LINEAR},WJ={[eW]:J.NEVER,[ZZ]:J.ALWAYS,[JZ]:J.LESS,[m7]:J.LEQUAL,[QZ]:J.EQUAL,[l7]:J.GEQUAL,[$Z]:J.GREATER,[WZ]:J.NOTEQUAL};function b0(L,O){if(O.type===I9&&Q.has("OES_texture_float_linear")===!1&&(O.magFilter===xJ||O.magFilter===f7||O.magFilter===e8||O.magFilter===o9||O.minFilter===xJ||O.minFilter===f7||O.minFilter===e8||O.minFilter===o9))w0("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");if(J.texParameteri(L,J.TEXTURE_WRAP_S,_0[O.wrapS]),J.texParameteri(L,J.TEXTURE_WRAP_T,_0[O.wrapT]),L===J.TEXTURE_3D||L===J.TEXTURE_2D_ARRAY)J.texParameteri(L,J.TEXTURE_WRAP_R,_0[O.wrapR]);if(J.texParameteri(L,J.TEXTURE_MAG_FILTER,z0[O.magFilter]),J.texParameteri(L,J.TEXTURE_MIN_FILTER,z0[O.minFilter]),O.compareFunction)J.texParameteri(L,J.TEXTURE_COMPARE_MODE,J.COMPARE_REF_TO_TEXTURE),J.texParameteri(L,J.TEXTURE_COMPARE_FUNC,WJ[O.compareFunction]);if(Q.has("EXT_texture_filter_anisotropic")===!0){if(O.magFilter===h9)return;if(O.minFilter!==e8&&O.minFilter!==o9)return;if(O.type===I9&&Q.has("OES_texture_float_linear")===!1)return;if(O.anisotropy>1||W.get(O).__currentAnisotropy){let w=Q.get("EXT_texture_filter_anisotropic");J.texParameterf(L,w.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(O.anisotropy,Z.getMaxAnisotropy())),W.get(O).__currentAnisotropy=O.anisotropy}}}function n(L,O){let w=!1;if(L.__webglInit===void 0)L.__webglInit=!0,O.addEventListener("dispose",C);let m=O.source,e=D.get(m);if(e===void 0)e={},D.set(m,e);let K0=p(O);if(K0!==L.__cacheKey){if(e[K0]===void 0)e[K0]={texture:J.createTexture(),usedTimes:0},Y.memory.textures++,w=!0;e[K0].usedTimes++;let H0=e[L.__cacheKey];if(H0!==void 0){if(e[L.__cacheKey].usedTimes--,H0.usedTimes===0)g(O)}L.__cacheKey=K0,L.__webglTexture=e[K0].texture}return w}function $0(L,O,w){return Math.floor(Math.floor(L/w)/O)}function Z0(L,O,w,m){let K0=L.updateRanges;if(K0.length===0)$.texSubImage2D(J.TEXTURE_2D,0,0,0,O.width,O.height,w,m,O.data);else{K0.sort((V0,U0)=>V0.start-U0.start);let H0=0;for(let V0=1;V0<K0.length;V0++){let U0=K0[H0],W0=K0[V0],I0=U0.start+U0.count,P0=$0(W0.start,O.width,4),c0=$0(U0.start,O.width,4);if(W0.start<=I0+1&&P0===c0&&$0(W0.start+W0.count-1,O.width,4)===P0)U0.count=Math.max(U0.count,W0.start+W0.count-U0.start);else++H0,K0[H0]=W0}K0.length=H0+1;let u=$.getParameter(J.UNPACK_ROW_LENGTH),i=$.getParameter(J.UNPACK_SKIP_PIXELS),D0=$.getParameter(J.UNPACK_SKIP_ROWS);$.pixelStorei(J.UNPACK_ROW_LENGTH,O.width);for(let V0=0,U0=K0.length;V0<U0;V0++){let W0=K0[V0],I0=Math.floor(W0.start/4),P0=Math.ceil(W0.count/4),c0=I0%O.width,y=Math.floor(I0/O.width),Y0=P0,s=1;$.pixelStorei(J.UNPACK_SKIP_PIXELS,c0),$.pixelStorei(J.UNPACK_SKIP_ROWS,y),$.texSubImage2D(J.TEXTURE_2D,0,c0,y,Y0,1,w,m,O.data)}L.clearUpdateRanges(),$.pixelStorei(J.UNPACK_ROW_LENGTH,u),$.pixelStorei(J.UNPACK_SKIP_PIXELS,i),$.pixelStorei(J.UNPACK_SKIP_ROWS,D0)}}function A0(L,O,w){let m=J.TEXTURE_2D;if(O.isDataArrayTexture||O.isCompressedArrayTexture)m=J.TEXTURE_2D_ARRAY;if(O.isData3DTexture)m=J.TEXTURE_3D;let e=n(L,O),K0=O.source;$.bindTexture(m,L.__webglTexture,J.TEXTURE0+w);let H0=W.get(K0);if(K0.version!==H0.__version||e===!0){if($.activeTexture(J.TEXTURE0+w),(typeof ImageBitmap<"u"&&O.image instanceof ImageBitmap)===!1){let s=m0.getPrimaries(m0.workingColorSpace),X0=O.colorSpace===e9?null:m0.getPrimaries(O.colorSpace),E0=O.colorSpace===e9||s===X0?J.NONE:J.BROWSER_DEFAULT_WEBGL;$.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,O.flipY),$.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),$.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,E0)}$.pixelStorei(J.UNPACK_ALIGNMENT,O.unpackAlignment);let i=F(O.image,!1,Z.maxTextureSize);i=s0(O,i);let D0=K.convert(O.format,O.colorSpace),V0=K.convert(O.type),U0=V(O.internalFormat,D0,V0,O.normalized,O.colorSpace,O.isVideoTexture);b0(m,O);let W0,I0=O.mipmaps,P0=O.isVideoTexture!==!0,c0=H0.__version===void 0||e===!0,y=K0.dataReady,Y0=P(O,i);if(O.isDepthTexture){if(U0=z(O.format===r9,O.type),c0)if(P0)$.texStorage2D(J.TEXTURE_2D,1,U0,i.width,i.height);else $.texImage2D(J.TEXTURE_2D,0,U0,i.width,i.height,0,D0,V0,null)}else if(O.isDataTexture)if(I0.length>0){if(P0&&c0)$.texStorage2D(J.TEXTURE_2D,Y0,U0,I0[0].width,I0[0].height);for(let s=0,X0=I0.length;s<X0;s++)if(W0=I0[s],P0){if(y)$.texSubImage2D(J.TEXTURE_2D,s,0,0,W0.width,W0.height,D0,V0,W0.data)}else $.texImage2D(J.TEXTURE_2D,s,U0,W0.width,W0.height,0,D0,V0,W0.data);O.generateMipmaps=!1}else if(P0){if(c0)$.texStorage2D(J.TEXTURE_2D,Y0,U0,i.width,i.height);if(y)Z0(O,i,D0,V0)}else $.texImage2D(J.TEXTURE_2D,0,U0,i.width,i.height,0,D0,V0,i.data);else if(O.isCompressedTexture)if(O.isCompressedArrayTexture){if(P0&&c0)$.texStorage3D(J.TEXTURE_2D_ARRAY,Y0,U0,I0[0].width,I0[0].height,i.depth);for(let s=0,X0=I0.length;s<X0;s++)if(W0=I0[s],O.format!==N9)if(D0!==null)if(P0){if(y)if(O.layerUpdates.size>0){let E0=Y$(W0.width,W0.height,O.format,O.type);for(let t of O.layerUpdates){let N0=W0.data.subarray(t*E0/W0.data.BYTES_PER_ELEMENT,(t+1)*E0/W0.data.BYTES_PER_ELEMENT);$.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,s,0,0,t,W0.width,W0.height,1,D0,N0)}}else $.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,s,0,0,0,W0.width,W0.height,i.depth,D0,W0.data)}else $.compressedTexImage3D(J.TEXTURE_2D_ARRAY,s,U0,W0.width,W0.height,i.depth,0,W0.data,0,0);else w0("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(P0){if(y)$.texSubImage3D(J.TEXTURE_2D_ARRAY,s,0,0,0,W0.width,W0.height,i.depth,D0,V0,W0.data)}else $.texImage3D(J.TEXTURE_2D_ARRAY,s,U0,W0.width,W0.height,i.depth,0,D0,V0,W0.data);if(O.layerUpdates.size>0)O.clearLayerUpdates()}else{if(P0&&c0)$.texStorage2D(J.TEXTURE_2D,Y0,U0,I0[0].width,I0[0].height);for(let s=0,X0=I0.length;s<X0;s++)if(W0=I0[s],O.format!==N9)if(D0!==null)if(P0){if(y)$.compressedTexSubImage2D(J.TEXTURE_2D,s,0,0,W0.width,W0.height,D0,W0.data)}else $.compressedTexImage2D(J.TEXTURE_2D,s,U0,W0.width,W0.height,0,W0.data);else w0("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(P0){if(y)$.texSubImage2D(J.TEXTURE_2D,s,0,0,W0.width,W0.height,D0,V0,W0.data)}else $.texImage2D(J.TEXTURE_2D,s,U0,W0.width,W0.height,0,D0,V0,W0.data)}else if(O.isDataArrayTexture)if(P0){if(c0)$.texStorage3D(J.TEXTURE_2D_ARRAY,Y0,U0,i.width,i.height,i.depth);if(y)if(O.layerUpdates.size>0){let s=Y$(i.width,i.height,O.format,O.type);for(let X0 of O.layerUpdates){let E0=i.data.subarray(X0*s/i.data.BYTES_PER_ELEMENT,(X0+1)*s/i.data.BYTES_PER_ELEMENT);$.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,X0,i.width,i.height,1,D0,V0,E0)}O.clearLayerUpdates()}else $.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,0,i.width,i.height,i.depth,D0,V0,i.data)}else $.texImage3D(J.TEXTURE_2D_ARRAY,0,U0,i.width,i.height,i.depth,0,D0,V0,i.data);else if(O.isData3DTexture)if(P0){if(c0)$.texStorage3D(J.TEXTURE_3D,Y0,U0,i.width,i.height,i.depth);if(y)$.texSubImage3D(J.TEXTURE_3D,0,0,0,0,i.width,i.height,i.depth,D0,V0,i.data)}else $.texImage3D(J.TEXTURE_3D,0,U0,i.width,i.height,i.depth,0,D0,V0,i.data);else if(O.isFramebufferTexture){if(c0)if(P0)$.texStorage2D(J.TEXTURE_2D,Y0,U0,i.width,i.height);else{let{width:s,height:X0}=i;for(let E0=0;E0<Y0;E0++)$.texImage2D(J.TEXTURE_2D,E0,U0,s,X0,0,D0,V0,null),s>>=1,X0>>=1}}else if(O.isHTMLTexture){if("texElementImage2D"in J){let s=J.canvas;if(!s.hasAttribute("layoutsubtree"))s.setAttribute("layoutsubtree","true");if(i.parentNode!==s){s.appendChild(i),E.add(O),s.onpaint=(X0)=>{let E0=X0.changedElements;for(let t of E)if(E0.includes(t.image))t.needsUpdate=!0},s.requestPaint();return}if(J.texElementImage2D.length===3)J.texElementImage2D(J.TEXTURE_2D,J.RGBA8,i);else{let{RGBA:E0,RGBA:t,UNSIGNED_BYTE:N0}=J;J.texElementImage2D(J.TEXTURE_2D,0,E0,t,N0,i)}J.texParameteri(J.TEXTURE_2D,J.TEXTURE_MIN_FILTER,J.LINEAR),J.texParameteri(J.TEXTURE_2D,J.TEXTURE_WRAP_S,J.CLAMP_TO_EDGE),J.texParameteri(J.TEXTURE_2D,J.TEXTURE_WRAP_T,J.CLAMP_TO_EDGE)}}else if(I0.length>0){if(P0&&c0){let s=UJ(I0[0]);$.texStorage2D(J.TEXTURE_2D,Y0,U0,s.width,s.height)}for(let s=0,X0=I0.length;s<X0;s++)if(W0=I0[s],P0){if(y)$.texSubImage2D(J.TEXTURE_2D,s,0,0,D0,V0,W0)}else $.texImage2D(J.TEXTURE_2D,s,U0,D0,V0,W0);O.generateMipmaps=!1}else if(P0){if(c0){let s=UJ(i);$.texStorage2D(J.TEXTURE_2D,Y0,U0,s.width,s.height)}if(y)$.texSubImage2D(J.TEXTURE_2D,0,0,0,D0,V0,i)}else $.texImage2D(J.TEXTURE_2D,0,U0,D0,V0,i);if(q(O))A(m);if(H0.__version=K0.version,O.onUpdate)O.onUpdate(O)}L.__version=O.version}function T0(L,O,w){if(O.image.length!==6)return;let m=n(L,O),e=O.source;$.bindTexture(J.TEXTURE_CUBE_MAP,L.__webglTexture,J.TEXTURE0+w);let K0=W.get(e);if(e.version!==K0.__version||m===!0){$.activeTexture(J.TEXTURE0+w);let H0=m0.getPrimaries(m0.workingColorSpace),u=O.colorSpace===e9?null:m0.getPrimaries(O.colorSpace),i=O.colorSpace===e9||H0===u?J.NONE:J.BROWSER_DEFAULT_WEBGL;$.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,O.flipY),$.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),$.pixelStorei(J.UNPACK_ALIGNMENT,O.unpackAlignment),$.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,i);let D0=O.isCompressedTexture||O.image[0].isCompressedTexture,V0=O.image[0]&&O.image[0].isDataTexture,U0=[];for(let t=0;t<6;t++){if(!D0&&!V0)U0[t]=F(O.image[t],!0,Z.maxCubemapSize);else U0[t]=V0?O.image[t].image:O.image[t];U0[t]=s0(O,U0[t])}let W0=U0[0],I0=K.convert(O.format,O.colorSpace),P0=K.convert(O.type),c0=V(O.internalFormat,I0,P0,O.normalized,O.colorSpace),y=O.isVideoTexture!==!0,Y0=K0.__version===void 0||m===!0,s=e.dataReady,X0=P(O,W0);b0(J.TEXTURE_CUBE_MAP,O);let E0;if(D0){if(y&&Y0)$.texStorage2D(J.TEXTURE_CUBE_MAP,X0,c0,W0.width,W0.height);for(let t=0;t<6;t++){E0=U0[t].mipmaps;for(let N0=0;N0<E0.length;N0++){let f0=E0[N0];if(O.format!==N9)if(I0!==null)if(y){if(s)$.compressedTexSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0,0,0,f0.width,f0.height,I0,f0.data)}else $.compressedTexImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0,c0,f0.width,f0.height,0,f0.data);else w0("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");else if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0,0,0,f0.width,f0.height,I0,P0,f0.data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0,c0,f0.width,f0.height,0,I0,P0,f0.data)}}}else{if(E0=O.mipmaps,y&&Y0){if(E0.length>0)X0++;let t=UJ(U0[0]);$.texStorage2D(J.TEXTURE_CUBE_MAP,X0,c0,t.width,t.height)}for(let t=0;t<6;t++)if(V0){if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,U0[t].width,U0[t].height,I0,P0,U0[t].data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,c0,U0[t].width,U0[t].height,0,I0,P0,U0[t].data);for(let N0=0;N0<E0.length;N0++){let ZJ=E0[N0].image[t].image;if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0+1,0,0,ZJ.width,ZJ.height,I0,P0,ZJ.data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0+1,c0,ZJ.width,ZJ.height,0,I0,P0,ZJ.data)}}else{if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,I0,P0,U0[t])}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,c0,I0,P0,U0[t]);for(let N0=0;N0<E0.length;N0++){let f0=E0[N0];if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0+1,0,0,I0,P0,f0.image[t])}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+t,N0+1,c0,I0,P0,f0.image[t])}}}if(q(O))A(J.TEXTURE_CUBE_MAP);if(K0.__version=e.version,O.onUpdate)O.onUpdate(O)}L.__version=O.version}function B0(L,O,w,m,e,K0){let H0=K.convert(w.format,w.colorSpace),u=K.convert(w.type),i=V(w.internalFormat,H0,u,w.normalized,w.colorSpace),D0=W.get(O),V0=W.get(w);if(V0.__renderTarget=O,!D0.__hasExternalTextures){let U0=Math.max(1,O.width>>K0),W0=Math.max(1,O.height>>K0);if(e===J.TEXTURE_3D||e===J.TEXTURE_2D_ARRAY)$.texImage3D(e,K0,i,U0,W0,O.depth,0,H0,u,null);else $.texImage2D(e,K0,i,U0,W0,0,H0,u,null)}if($.bindFramebuffer(J.FRAMEBUFFER,L),T(O))X.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,m,e,V0.__webglTexture,0,OJ(O));else if(e===J.TEXTURE_2D||e>=J.TEXTURE_CUBE_MAP_POSITIVE_X&&e<=J.TEXTURE_CUBE_MAP_NEGATIVE_Z)J.framebufferTexture2D(J.FRAMEBUFFER,m,e,V0.__webglTexture,K0);$.bindFramebuffer(J.FRAMEBUFFER,null)}function DJ(L,O,w){if(J.bindRenderbuffer(J.RENDERBUFFER,L),O.depthBuffer){let m=O.depthTexture,e=m&&m.isDepthTexture?m.type:null,K0=z(O.stencilBuffer,e),H0=O.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;if(T(O))X.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,OJ(O),K0,O.width,O.height);else if(w)J.renderbufferStorageMultisample(J.RENDERBUFFER,OJ(O),K0,O.width,O.height);else J.renderbufferStorage(J.RENDERBUFFER,K0,O.width,O.height);J.framebufferRenderbuffer(J.FRAMEBUFFER,H0,J.RENDERBUFFER,L)}else{let m=O.textures;for(let e=0;e<m.length;e++){let K0=m[e],H0=K.convert(K0.format,K0.colorSpace),u=K.convert(K0.type),i=V(K0.internalFormat,H0,u,K0.normalized,K0.colorSpace);if(T(O))X.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,OJ(O),i,O.width,O.height);else if(w)J.renderbufferStorageMultisample(J.RENDERBUFFER,OJ(O),i,O.width,O.height);else J.renderbufferStorage(J.RENDERBUFFER,i,O.width,O.height)}}J.bindRenderbuffer(J.RENDERBUFFER,null)}function p0(L,O,w){let m=O.isWebGLCubeRenderTarget===!0;if($.bindFramebuffer(J.FRAMEBUFFER,L),!(O.depthTexture&&O.depthTexture.isDepthTexture))throw Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let e=W.get(O.depthTexture);if(e.__renderTarget=O,!e.__webglTexture||O.depthTexture.image.width!==O.width||O.depthTexture.image.height!==O.height)O.depthTexture.image.width=O.width,O.depthTexture.image.height=O.height,O.depthTexture.needsUpdate=!0;if(m){if(e.__webglInit===void 0)e.__webglInit=!0,O.depthTexture.addEventListener("dispose",C);if(e.__webglTexture===void 0){e.__webglTexture=J.createTexture(),$.bindTexture(J.TEXTURE_CUBE_MAP,e.__webglTexture),b0(J.TEXTURE_CUBE_MAP,O.depthTexture);let D0=K.convert(O.depthTexture.format),V0=K.convert(O.depthTexture.type),U0;if(O.depthTexture.format===a9)U0=J.DEPTH_COMPONENT24;else if(O.depthTexture.format===r9)U0=J.DEPTH24_STENCIL8;for(let W0=0;W0<6;W0++)J.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+W0,0,U0,O.width,O.height,0,D0,V0,null)}}else Q0(O.depthTexture,0);let K0=e.__webglTexture,H0=OJ(O),u=m?J.TEXTURE_CUBE_MAP_POSITIVE_X+w:J.TEXTURE_2D,i=O.depthTexture.format===r9?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;if(O.depthTexture.format===a9)if(T(O))X.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,i,u,K0,0,H0);else J.framebufferTexture2D(J.FRAMEBUFFER,i,u,K0,0);else if(O.depthTexture.format===r9)if(T(O))X.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,i,u,K0,0,H0);else J.framebufferTexture2D(J.FRAMEBUFFER,i,u,K0,0);else throw Error("THREE.WebGLTextures: Unknown depthTexture format.")}function l0(L){let O=W.get(L),w=L.isWebGLCubeRenderTarget===!0;if(O.__boundDepthTexture!==L.depthTexture){let m=L.depthTexture;if(O.__depthDisposeCallback)O.__depthDisposeCallback();if(m){let e=()=>{delete O.__boundDepthTexture,delete O.__depthDisposeCallback,m.removeEventListener("dispose",e)};m.addEventListener("dispose",e),O.__depthDisposeCallback=e}O.__boundDepthTexture=m}if(L.depthTexture&&!O.__autoAllocateDepthBuffer)if(w)for(let m=0;m<6;m++)p0(O.__webglFramebuffer[m],L,m);else{let m=L.texture.mipmaps;if(m&&m.length>0)p0(O.__webglFramebuffer[0],L,0);else p0(O.__webglFramebuffer,L,0)}else if(w){O.__webglDepthbuffer=[];for(let m=0;m<6;m++)if($.bindFramebuffer(J.FRAMEBUFFER,O.__webglFramebuffer[m]),O.__webglDepthbuffer[m]===void 0)O.__webglDepthbuffer[m]=J.createRenderbuffer(),DJ(O.__webglDepthbuffer[m],L,!1);else{let e=L.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,K0=O.__webglDepthbuffer[m];J.bindRenderbuffer(J.RENDERBUFFER,K0),J.framebufferRenderbuffer(J.FRAMEBUFFER,e,J.RENDERBUFFER,K0)}}else{let m=L.texture.mipmaps;if(m&&m.length>0)$.bindFramebuffer(J.FRAMEBUFFER,O.__webglFramebuffer[0]);else $.bindFramebuffer(J.FRAMEBUFFER,O.__webglFramebuffer);if(O.__webglDepthbuffer===void 0)O.__webglDepthbuffer=J.createRenderbuffer(),DJ(O.__webglDepthbuffer,L,!1);else{let e=L.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,K0=O.__webglDepthbuffer;J.bindRenderbuffer(J.RENDERBUFFER,K0),J.framebufferRenderbuffer(J.FRAMEBUFFER,e,J.RENDERBUFFER,K0)}}$.bindFramebuffer(J.FRAMEBUFFER,null)}function a0(L,O,w){let m=W.get(L);if(O!==void 0)B0(m.__webglFramebuffer,L,L.texture,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,0);if(w!==void 0)l0(L)}function d0(L){let O=L.texture,w=W.get(L),m=W.get(O);L.addEventListener("dispose",k);let e=L.textures,K0=L.isWebGLCubeRenderTarget===!0,H0=e.length>1;if(!H0){if(m.__webglTexture===void 0)m.__webglTexture=J.createTexture();m.__version=O.version,Y.memory.textures++}if(K0){w.__webglFramebuffer=[];for(let u=0;u<6;u++)if(O.mipmaps&&O.mipmaps.length>0){w.__webglFramebuffer[u]=[];for(let i=0;i<O.mipmaps.length;i++)w.__webglFramebuffer[u][i]=J.createFramebuffer()}else w.__webglFramebuffer[u]=J.createFramebuffer()}else{if(O.mipmaps&&O.mipmaps.length>0){w.__webglFramebuffer=[];for(let u=0;u<O.mipmaps.length;u++)w.__webglFramebuffer[u]=J.createFramebuffer()}else w.__webglFramebuffer=J.createFramebuffer();if(H0)for(let u=0,i=e.length;u<i;u++){let D0=W.get(e[u]);if(D0.__webglTexture===void 0)D0.__webglTexture=J.createTexture(),Y.memory.textures++}if(L.samples>0&&T(L)===!1){w.__webglMultisampledFramebuffer=J.createFramebuffer(),w.__webglColorRenderbuffer=[],$.bindFramebuffer(J.FRAMEBUFFER,w.__webglMultisampledFramebuffer);for(let u=0;u<e.length;u++){let i=e[u];w.__webglColorRenderbuffer[u]=J.createRenderbuffer(),J.bindRenderbuffer(J.RENDERBUFFER,w.__webglColorRenderbuffer[u]);let D0=K.convert(i.format,i.colorSpace),V0=K.convert(i.type),U0=V(i.internalFormat,D0,V0,i.normalized,i.colorSpace,L.isXRRenderTarget===!0),W0=OJ(L);J.renderbufferStorageMultisample(J.RENDERBUFFER,W0,U0,L.width,L.height),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+u,J.RENDERBUFFER,w.__webglColorRenderbuffer[u])}if(J.bindRenderbuffer(J.RENDERBUFFER,null),L.depthBuffer)w.__webglDepthRenderbuffer=J.createRenderbuffer(),DJ(w.__webglDepthRenderbuffer,L,!0);$.bindFramebuffer(J.FRAMEBUFFER,null)}}if(K0){$.bindTexture(J.TEXTURE_CUBE_MAP,m.__webglTexture),b0(J.TEXTURE_CUBE_MAP,O);for(let u=0;u<6;u++)if(O.mipmaps&&O.mipmaps.length>0)for(let i=0;i<O.mipmaps.length;i++)B0(w.__webglFramebuffer[u][i],L,O,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+u,i);else B0(w.__webglFramebuffer[u],L,O,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+u,0);if(q(O))A(J.TEXTURE_CUBE_MAP);$.unbindTexture()}else if(H0){for(let u=0,i=e.length;u<i;u++){let D0=e[u],V0=W.get(D0),U0=J.TEXTURE_2D;if(L.isWebGL3DRenderTarget||L.isWebGLArrayRenderTarget)U0=L.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if($.bindTexture(U0,V0.__webglTexture),b0(U0,D0),B0(w.__webglFramebuffer,L,D0,J.COLOR_ATTACHMENT0+u,U0,0),q(D0))A(U0)}$.unbindTexture()}else{let u=J.TEXTURE_2D;if(L.isWebGL3DRenderTarget||L.isWebGLArrayRenderTarget)u=L.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if($.bindTexture(u,m.__webglTexture),b0(u,O),O.mipmaps&&O.mipmaps.length>0)for(let i=0;i<O.mipmaps.length;i++)B0(w.__webglFramebuffer[i],L,O,J.COLOR_ATTACHMENT0,u,i);else B0(w.__webglFramebuffer,L,O,J.COLOR_ATTACHMENT0,u,0);if(q(O))A(u);$.unbindTexture()}if(L.depthBuffer)l0(L)}function IJ(L){let O=L.textures;for(let w=0,m=O.length;w<m;w++){let e=O[w];if(q(e)){let K0=j(L),H0=W.get(e).__webglTexture;$.bindTexture(K0,H0),A(K0),$.unbindTexture()}}}let XJ=[],vJ=[];function EJ(L){if(L.samples>0){if(T(L)===!1){let{textures:O,width:w,height:m}=L,e=J.COLOR_BUFFER_BIT,K0=L.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,H0=W.get(L),u=O.length>1;if(u)for(let D0=0;D0<O.length;D0++)$.bindFramebuffer(J.FRAMEBUFFER,H0.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+D0,J.RENDERBUFFER,null),$.bindFramebuffer(J.FRAMEBUFFER,H0.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+D0,J.TEXTURE_2D,null,0);$.bindFramebuffer(J.READ_FRAMEBUFFER,H0.__webglMultisampledFramebuffer);let i=L.texture.mipmaps;if(i&&i.length>0)$.bindFramebuffer(J.DRAW_FRAMEBUFFER,H0.__webglFramebuffer[0]);else $.bindFramebuffer(J.DRAW_FRAMEBUFFER,H0.__webglFramebuffer);for(let D0=0;D0<O.length;D0++){if(L.resolveDepthBuffer){if(L.depthBuffer)e|=J.DEPTH_BUFFER_BIT;if(L.stencilBuffer&&L.resolveStencilBuffer)e|=J.STENCIL_BUFFER_BIT}if(u){J.framebufferRenderbuffer(J.READ_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.RENDERBUFFER,H0.__webglColorRenderbuffer[D0]);let V0=W.get(O[D0]).__webglTexture;J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,V0,0)}if(J.blitFramebuffer(0,0,w,m,0,0,w,m,e,J.NEAREST),H===!0){if(XJ.length=0,vJ.length=0,XJ.push(J.COLOR_ATTACHMENT0+D0),L.depthBuffer&&L.storeMultisampledDepthBuffer===!1)XJ.push(K0),vJ.push(K0),J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,vJ);J.invalidateFramebuffer(J.READ_FRAMEBUFFER,XJ)}}if($.bindFramebuffer(J.READ_FRAMEBUFFER,null),$.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),u)for(let D0=0;D0<O.length;D0++){$.bindFramebuffer(J.FRAMEBUFFER,H0.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+D0,J.RENDERBUFFER,H0.__webglColorRenderbuffer[D0]);let V0=W.get(O[D0]).__webglTexture;$.bindFramebuffer(J.FRAMEBUFFER,H0.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+D0,J.TEXTURE_2D,V0,0)}$.bindFramebuffer(J.DRAW_FRAMEBUFFER,H0.__webglMultisampledFramebuffer)}else if(L.depthBuffer&&L.storeMultisampledDepthBuffer===!1&&H){let O=L.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,[O])}}}function OJ(L){return Math.min(Z.maxSamples,L.samples)}function T(L){let O=W.get(L);return L.samples>0&&Q.has("WEBGL_multisampled_render_to_texture")===!0&&O.__useRenderToTexture!==!1}function hJ(L){let O=Y.render.frame;if(N.get(L)!==O)N.set(L,O),L.update()}function s0(L,O){let{colorSpace:w,format:m,type:e}=L;if(L.isCompressedTexture===!0||L.isVideoTexture===!0)return O;if(w!==_Q&&w!==e9)if(m0.getTransfer(w)===$J){if(m!==N9||e!==Z9)w0("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.")}else S0("WebGLTextures: Unsupported texture color space:",w);return O}function UJ(L){if(typeof HTMLImageElement<"u"&&L instanceof HTMLImageElement)U.width=L.naturalWidth||L.width,U.height=L.naturalHeight||L.height;else if(typeof VideoFrame<"u"&&L instanceof VideoFrame)U.width=L.displayWidth,U.height=L.displayHeight;else U.width=L.width,U.height=L.height;return U}this.allocateTextureUnit=o,this.resetTextureUnits=a,this.getTextureUnits=_,this.setTextureUnits=d,this.setTexture2D=Q0,this.setTexture2DArray=c,this.setTexture3D=r,this.setTextureCube=J0,this.rebindTextures=a0,this.setupRenderTarget=d0,this.updateRenderTargetMipmap=IJ,this.updateMultisampleRenderTarget=EJ,this.setupDepthRenderbuffer=l0,this.setupFrameBufferTexture=B0,this.useMultisampledRTT=T,this.isReversedDepthBuffer=function(){return $.buffers.depth.getReversed()}}function ZN(J,Q){function $(W,Z=e9){let K,Y=m0.getTransfer(Z);if(W===Z9)return J.UNSIGNED_BYTE;if(W===s6)return J.UNSIGNED_SHORT_4_4_4_4;if(W===i6)return J.UNSIGNED_SHORT_5_5_5_1;if(W===nW)return J.UNSIGNED_INT_5_9_9_9_REV;if(W===sW)return J.UNSIGNED_INT_10F_11F_11F_REV;if(W===uW)return J.BYTE;if(W===cW)return J.SHORT;if(W===J7)return J.UNSIGNED_SHORT;if(W===n6)return J.INT;if(W===b9)return J.UNSIGNED_INT;if(W===I9)return J.FLOAT;if(W===G9)return J.HALF_FLOAT;if(W===iW)return J.ALPHA;if(W===oW)return J.RGB;if(W===N9)return J.RGBA;if(W===a9)return J.DEPTH_COMPONENT;if(W===r9)return J.DEPTH_STENCIL;if(W===aW)return J.RED;if(W===o6)return J.RED_INTEGER;if(W===t9)return J.RG;if(W===a6)return J.RG_INTEGER;if(W===r6)return J.RGBA_INTEGER;if(W===v7||W===h7||W===b7||W===x7)if(Y===$J)if(K=Q.get("WEBGL_compressed_texture_s3tc_srgb"),K!==null){if(W===v7)return K.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(W===h7)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(W===b7)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(W===x7)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(K=Q.get("WEBGL_compressed_texture_s3tc"),K!==null){if(W===v7)return K.COMPRESSED_RGB_S3TC_DXT1_EXT;if(W===h7)return K.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(W===b7)return K.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(W===x7)return K.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(W===t6||W===e6||W===JQ||W===QQ)if(K=Q.get("WEBGL_compressed_texture_pvrtc"),K!==null){if(W===t6)return K.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(W===e6)return K.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(W===JQ)return K.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(W===QQ)return K.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(W===$Q||W===WQ||W===ZQ||W===KQ||W===YQ||W===g7||W===XQ)if(K=Q.get("WEBGL_compressed_texture_etc"),K!==null){if(W===$Q||W===WQ)return Y===$J?K.COMPRESSED_SRGB8_ETC2:K.COMPRESSED_RGB8_ETC2;if(W===ZQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:K.COMPRESSED_RGBA8_ETC2_EAC;if(W===KQ)return K.COMPRESSED_R11_EAC;if(W===YQ)return K.COMPRESSED_SIGNED_R11_EAC;if(W===g7)return K.COMPRESSED_RG11_EAC;if(W===XQ)return K.COMPRESSED_SIGNED_RG11_EAC}else return null;if(W===HQ||W===UQ||W===GQ||W===NQ||W===qQ||W===FQ||W===DQ||W===EQ||W===OQ||W===RQ||W===kQ||W===MQ||W===LQ||W===VQ)if(K=Q.get("WEBGL_compressed_texture_astc"),K!==null){if(W===HQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:K.COMPRESSED_RGBA_ASTC_4x4_KHR;if(W===UQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:K.COMPRESSED_RGBA_ASTC_5x4_KHR;if(W===GQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:K.COMPRESSED_RGBA_ASTC_5x5_KHR;if(W===NQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:K.COMPRESSED_RGBA_ASTC_6x5_KHR;if(W===qQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:K.COMPRESSED_RGBA_ASTC_6x6_KHR;if(W===FQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:K.COMPRESSED_RGBA_ASTC_8x5_KHR;if(W===DQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:K.COMPRESSED_RGBA_ASTC_8x6_KHR;if(W===EQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:K.COMPRESSED_RGBA_ASTC_8x8_KHR;if(W===OQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:K.COMPRESSED_RGBA_ASTC_10x5_KHR;if(W===RQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:K.COMPRESSED_RGBA_ASTC_10x6_KHR;if(W===kQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:K.COMPRESSED_RGBA_ASTC_10x8_KHR;if(W===MQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:K.COMPRESSED_RGBA_ASTC_10x10_KHR;if(W===LQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:K.COMPRESSED_RGBA_ASTC_12x10_KHR;if(W===VQ)return Y===$J?K.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:K.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(W===BQ||W===IQ||W===zQ)if(K=Q.get("EXT_texture_compression_bptc"),K!==null){if(W===BQ)return Y===$J?K.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:K.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(W===IQ)return K.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(W===zQ)return K.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(W===AQ||W===PQ||W===p7||W===CQ)if(K=Q.get("EXT_texture_compression_rgtc"),K!==null){if(W===AQ)return K.COMPRESSED_RED_RGTC1_EXT;if(W===PQ)return K.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(W===p7)return K.COMPRESSED_RED_GREEN_RGTC2_EXT;if(W===CQ)return K.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;if(W===S8)return J.UNSIGNED_INT_24_8;return J[W]!==void 0?J[W]:null}return{convert:$}}var KN=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,YN=`
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

}`;class nZ{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(J,Q){if(this.texture===null){let $=new o7(J.texture);if(J.depthNear!==Q.depthNear||J.depthFar!==Q.depthFar)this.depthNear=J.depthNear,this.depthFar=J.depthFar;this.texture=$}}getMesh(J){if(this.texture!==null){if(this.mesh===null){let Q=J.cameras[0].viewport,$=new zJ({vertexShader:KN,fragmentShader:YN,uniforms:{depthColor:{value:this.texture},depthWidth:{value:Q.z},depthHeight:{value:Q.w}}});this.mesh=new BJ(new Q8(20,20),$)}}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class sZ extends q9{constructor(J,Q){super();let $=this,W=null,Z=1,K=null,Y="local-floor",X=1,H=null,U=null,N=null,E=null,G=null,D=null,M=typeof XRWebGLBinding<"u",I=new nZ,F={},q=Q.getContextAttributes(),A=null,j=null,V=[],z=[],P=new j0,C=null,k=null,B=new dJ;B.viewport=new GJ;let g=new dJ;g.viewport=new GJ;let f=[B,g],h=new $$,a=null,_=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(n){let $0=V[n];if($0===void 0)$0=new W7,V[n]=$0;return $0.getTargetRaySpace()},this.getControllerGrip=function(n){let $0=V[n];if($0===void 0)$0=new W7,V[n]=$0;return $0.getGripSpace()},this.getHand=function(n){let $0=V[n];if($0===void 0)$0=new W7,V[n]=$0;return $0.getHandSpace()};function d(n){let $0=z.indexOf(n.inputSource);if($0===-1)return;let Z0=V[$0];if(Z0!==void 0)Z0.update(n.inputSource,n.frame,H||K),Z0.dispatchEvent({type:n.type,data:n.inputSource})}function o(){W.removeEventListener("select",d),W.removeEventListener("selectstart",d),W.removeEventListener("selectend",d),W.removeEventListener("squeeze",d),W.removeEventListener("squeezestart",d),W.removeEventListener("squeezeend",d),W.removeEventListener("end",o),W.removeEventListener("inputsourceschange",p);for(let n=0;n<V.length;n++){let $0=z[n];if($0===null)continue;z[n]=null,V[n].disconnect($0)}a=null,_=null,I.reset();for(let n in F)delete F[n];if(J.setRenderTarget(A),G=null,E=null,N=null,W=null,j=null,b0.stop(),$.isPresenting=!1,J.setPixelRatio(C),J.setSize(P.width,P.height,!1),k!==null){let n=k.camera;n.fov=k.fov,n.zoom=k.zoom,n.updateProjectionMatrix(),k=null}$.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(n){if(Z=n,$.isPresenting===!0)w0("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(n){if(Y=n,$.isPresenting===!0)w0("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return H||K},this.setReferenceSpace=function(n){H=n},this.getBaseLayer=function(){return E!==null?E:G},this.getBinding=function(){if(N===null&&M)N=new XRWebGLBinding(W,Q);return N},this.getFrame=function(){return D},this.getSession=function(){return W},this.setSession=async function(n){if(W=n,W!==null){if(A=J.getRenderTarget(),W.addEventListener("select",d),W.addEventListener("selectstart",d),W.addEventListener("selectend",d),W.addEventListener("squeeze",d),W.addEventListener("squeezestart",d),W.addEventListener("squeezeend",d),W.addEventListener("end",o),W.addEventListener("inputsourceschange",p),q.xrCompatible!==!0)await Q.makeXRCompatible();if(C=J.getPixelRatio(),J.getSize(P),!(M&&("createProjectionLayer"in XRWebGLBinding.prototype))){let Z0={antialias:q.antialias,alpha:!0,depth:q.depth,stencil:q.stencil,framebufferScaleFactor:Z};G=new XRWebGLLayer(W,Q,Z0),W.updateRenderState({baseLayer:G}),J.setPixelRatio(1),J.setSize(G.framebufferWidth,G.framebufferHeight,!1),j=new cJ(G.framebufferWidth,G.framebufferHeight,{format:N9,type:Z9,colorSpace:J.outputColorSpace,stencilBuffer:q.stencil,resolveDepthBuffer:G.ignoreDepthValues===!1,resolveStencilBuffer:G.ignoreDepthValues===!1,storeMultisampledDepthBuffer:G.ignoreDepthValues===!1,storeMultisampledStencilBuffer:G.ignoreDepthValues===!1})}else{let Z0=null,A0=null,T0=null;if(q.depth)T0=q.stencil?Q.DEPTH24_STENCIL8:Q.DEPTH_COMPONENT24,Z0=q.stencil?r9:a9,A0=q.stencil?S8:b9;let B0={colorFormat:Q.RGBA8,depthFormat:T0,scaleFactor:Z};N=this.getBinding(),E=N.createProjectionLayer(B0),W.updateRenderState({layers:[E]}),J.setPixelRatio(1),J.setSize(E.textureWidth,E.textureHeight,!1),j=new cJ(E.textureWidth,E.textureHeight,{format:N9,type:Z9,depthTexture:new J8(E.textureWidth,E.textureHeight,A0,void 0,void 0,void 0,void 0,void 0,void 0,Z0),stencilBuffer:q.stencil,colorSpace:J.outputColorSpace,samples:q.antialias?4:0,resolveDepthBuffer:E.ignoreDepthValues===!1,resolveStencilBuffer:E.ignoreDepthValues===!1,storeMultisampledDepthBuffer:E.ignoreDepthValues===!1,storeMultisampledStencilBuffer:E.ignoreDepthValues===!1})}j.isXRRenderTarget=!0,this.setFoveation(X),H=null,K=await W.requestReferenceSpace(Y),b0.setContext(W),b0.start(),$.isPresenting=!0,$.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(W!==null)return W.environmentBlendMode},this.getDepthTexture=function(){return I.getDepthTexture()};function p(n){for(let $0=0;$0<n.removed.length;$0++){let Z0=n.removed[$0],A0=z.indexOf(Z0);if(A0>=0)z[A0]=null,V[A0].disconnect(Z0)}for(let $0=0;$0<n.added.length;$0++){let Z0=n.added[$0],A0=z.indexOf(Z0);if(A0===-1){for(let B0=0;B0<V.length;B0++)if(B0>=z.length){z.push(Z0),A0=B0;break}else if(z[B0]===null){z[B0]=Z0,A0=B0;break}if(A0===-1)break}let T0=V[A0];if(T0)T0.connect(Z0)}}let Q0=new v,c=new v;function r(n,$0,Z0){Q0.setFromMatrixPosition($0.matrixWorld),c.setFromMatrixPosition(Z0.matrixWorld);let A0=Q0.distanceTo(c),T0=$0.projectionMatrix.elements,B0=Z0.projectionMatrix.elements,DJ=T0[14]/(T0[10]-1),p0=T0[14]/(T0[10]+1),l0=(T0[9]+1)/T0[5],a0=(T0[9]-1)/T0[5],d0=(T0[8]-1)/T0[0],IJ=(B0[8]+1)/B0[0],XJ=DJ*d0,vJ=DJ*IJ,EJ=A0/(-d0+IJ),OJ=EJ*-d0;if($0.matrixWorld.decompose(n.position,n.quaternion,n.scale),n.translateX(OJ),n.translateZ(EJ),n.matrixWorld.compose(n.position,n.quaternion,n.scale),n.matrixWorldInverse.copy(n.matrixWorld).invert(),T0[10]===-1)n.projectionMatrix.copy($0.projectionMatrix),n.projectionMatrixInverse.copy($0.projectionMatrixInverse);else{let T=DJ+EJ,hJ=p0+EJ,s0=XJ-OJ,UJ=vJ+(A0-OJ),L=l0*p0/hJ*T,O=a0*p0/hJ*T;n.projectionMatrix.makePerspective(s0,UJ,L,O,T,hJ),n.projectionMatrixInverse.copy(n.projectionMatrix).invert()}}function J0(n,$0){if($0===null)n.matrixWorld.copy(n.matrix);else n.matrixWorld.multiplyMatrices($0.matrixWorld,n.matrix);n.matrixWorldInverse.copy(n.matrixWorld).invert()}this.updateCamera=function(n){if(W===null)return;let{near:$0,far:Z0}=n;if(I.texture!==null){if(I.depthNear>0)$0=I.depthNear;if(I.depthFar>0)Z0=I.depthFar}if(h.near=g.near=B.near=$0,h.far=g.far=B.far=Z0,a!==h.near||_!==h.far)W.updateRenderState({depthNear:h.near,depthFar:h.far}),a=h.near,_=h.far;h.layers.mask=n.layers.mask|6,B.layers.mask=h.layers.mask&-5,g.layers.mask=h.layers.mask&-3;let A0=n.parent,T0=h.cameras;J0(h,A0);for(let B0=0;B0<T0.length;B0++)J0(T0[B0],A0);if(T0.length===2)r(h,B,g);else h.projectionMatrix.copy(B.projectionMatrix);if(k===null&&n.isPerspectiveCamera)k={camera:n,fov:n.fov,zoom:n.zoom};_0(n,h,A0)};function _0(n,$0,Z0){if(Z0===null)n.matrix.copy($0.matrixWorld);else n.matrix.copy(Z0.matrixWorld),n.matrix.invert(),n.matrix.multiply($0.matrixWorld);if(n.matrix.decompose(n.position,n.quaternion,n.scale),n.updateMatrixWorld(!0),n.projectionMatrix.copy($0.projectionMatrix),n.projectionMatrixInverse.copy($0.projectionMatrixInverse),n.isPerspectiveCamera)n.fov=P8*2*Math.atan(1/n.projectionMatrix.elements[5]),n.zoom=1}this.getCamera=function(){return h},this.getFoveation=function(){if(E===null&&G===null)return;return X},this.setFoveation=function(n){if(X=n,E!==null)E.fixedFoveation=n;if(G!==null&&G.fixedFoveation!==void 0)G.fixedFoveation=n},this.hasDepthSensing=function(){return I.texture!==null},this.getDepthSensingMesh=function(){return I.getMesh(h)},this.getCameraTexture=function(n){return F[n]};let z0=null;function WJ(n,$0){if(U=$0.getViewerPose(H||K),D=$0,U!==null){let Z0=U.views;if(G!==null)J.setRenderTargetFramebuffer(j,G.framebuffer),J.setRenderTarget(j);let A0=!1;if(Z0.length!==h.cameras.length)h.cameras.length=0,A0=!0;for(let p0=0;p0<Z0.length;p0++){let l0=Z0[p0],a0=null;if(G!==null)a0=G.getViewport(l0);else{let IJ=N.getViewSubImage(E,l0);if(a0=IJ.viewport,p0===0)J.setRenderTargetTextures(j,IJ.colorTexture,IJ.depthStencilTexture),J.setRenderTarget(j)}let d0=f[p0];if(d0===void 0)d0=new dJ,d0.layers.enable(p0),d0.viewport=new GJ,f[p0]=d0;if(d0.matrix.fromArray(l0.transform.matrix),d0.matrix.decompose(d0.position,d0.quaternion,d0.scale),d0.projectionMatrix.fromArray(l0.projectionMatrix),d0.projectionMatrixInverse.copy(d0.projectionMatrix).invert(),d0.viewport.set(a0.x,a0.y,a0.width,a0.height),p0===0)h.matrix.copy(d0.matrix),h.matrix.decompose(h.position,h.quaternion,h.scale);if(A0===!0)h.cameras.push(d0)}let T0=W.enabledFeatures;if(T0&&T0.includes("depth-sensing")&&W.depthUsage=="gpu-optimized"&&M){N=$.getBinding();let p0=N.getDepthInformation(Z0[0]);if(p0&&p0.isValid&&p0.texture)I.init(p0,W.renderState)}if(T0&&T0.includes("camera-access")&&M){J.state.unbindTexture(),N=$.getBinding();for(let p0=0;p0<Z0.length;p0++){let l0=Z0[p0].camera;if(l0){let a0=F[l0];if(!a0)a0=new o7,F[l0]=a0;let d0=N.getCameraImage(l0);a0.sourceTexture=d0}}}}for(let Z0=0;Z0<V.length;Z0++){let A0=z[Z0],T0=V[Z0];if(A0!==null&&T0!==void 0)T0.update(A0,$0,H||K)}if(z0)z0(n,$0);if($0.detectedPlanes)$.dispatchEvent({type:"planesdetected",data:$0});D=null}let b0=new vZ;b0.setAnimationLoop(WJ),this.setAnimationLoop=function(n){z0=n},this.dispose=function(){}}}var XN=new YJ,iZ=new y0;iZ.set(-1,0,0,0,1,0,0,0,1);function HN(J,Q){function $(F,q){if(F.matrixAutoUpdate===!0)F.updateMatrix();q.value.copy(F.matrix)}function W(F,q){if(q.color.getRGB(F.fogColor.value,mQ(J)),q.isFog)F.fogNear.value=q.near,F.fogFar.value=q.far;else if(q.isFogExp2)F.fogDensity.value=q.density}function Z(F,q,A,j,V){if(q.isNodeMaterial)q.uniformsNeedUpdate=!1;else if(q.isMeshBasicMaterial)K(F,q);else if(q.isMeshLambertMaterial){if(K(F,q),q.envMap)F.envMapIntensity.value=q.envMapIntensity}else if(q.isMeshToonMaterial)K(F,q),E(F,q);else if(q.isMeshPhongMaterial){if(K(F,q),N(F,q),q.envMap)F.envMapIntensity.value=q.envMapIntensity}else if(q.isMeshStandardMaterial){if(K(F,q),G(F,q),q.isMeshPhysicalMaterial)D(F,q,V)}else if(q.isMeshMatcapMaterial)K(F,q),M(F,q);else if(q.isMeshDepthMaterial)K(F,q);else if(q.isMeshDistanceMaterial)K(F,q),I(F,q);else if(q.isMeshNormalMaterial)K(F,q);else if(q.isLineBasicMaterial){if(Y(F,q),q.isLineDashedMaterial)X(F,q)}else if(q.isPointsMaterial)H(F,q,A,j);else if(q.isSpriteMaterial)U(F,q);else if(q.isShadowMaterial)F.color.value.copy(q.color),F.opacity.value=q.opacity;else if(q.isShaderMaterial)q.uniformsNeedUpdate=!1}function K(F,q){if(F.opacity.value=q.opacity,q.color)F.diffuse.value.copy(q.color);if(q.emissive)F.emissive.value.copy(q.emissive).multiplyScalar(q.emissiveIntensity);if(q.map)F.map.value=q.map,$(q.map,F.mapTransform);if(q.alphaMap)F.alphaMap.value=q.alphaMap,$(q.alphaMap,F.alphaMapTransform);if(q.bumpMap){if(F.bumpMap.value=q.bumpMap,$(q.bumpMap,F.bumpMapTransform),F.bumpScale.value=q.bumpScale,q.side===bJ)F.bumpScale.value*=-1}if(q.normalMap){if(F.normalMap.value=q.normalMap,$(q.normalMap,F.normalMapTransform),F.normalScale.value.copy(q.normalScale),q.side===bJ)F.normalScale.value.negate()}if(q.displacementMap)F.displacementMap.value=q.displacementMap,$(q.displacementMap,F.displacementMapTransform),F.displacementScale.value=q.displacementScale,F.displacementBias.value=q.displacementBias;if(q.emissiveMap)F.emissiveMap.value=q.emissiveMap,$(q.emissiveMap,F.emissiveMapTransform);if(q.specularMap)F.specularMap.value=q.specularMap,$(q.specularMap,F.specularMapTransform);if(q.alphaTest>0)F.alphaTest.value=q.alphaTest;let A=Q.get(q),j=A.envMap,V=A.envMapRotation;if(j){if(F.envMap.value=j,F.envMapRotation.value.setFromMatrix4(XN.makeRotationFromEuler(V)).transpose(),j.isCubeTexture&&j.isRenderTargetTexture===!1)F.envMapRotation.value.premultiply(iZ);F.reflectivity.value=q.reflectivity,F.ior.value=q.ior,F.refractionRatio.value=q.refractionRatio}if(q.lightMap)F.lightMap.value=q.lightMap,F.lightMapIntensity.value=q.lightMapIntensity,$(q.lightMap,F.lightMapTransform);if(q.aoMap)F.aoMap.value=q.aoMap,F.aoMapIntensity.value=q.aoMapIntensity,$(q.aoMap,F.aoMapTransform)}function Y(F,q){if(F.diffuse.value.copy(q.color),F.opacity.value=q.opacity,q.map)F.map.value=q.map,$(q.map,F.mapTransform)}function X(F,q){F.dashSize.value=q.dashSize,F.totalSize.value=q.dashSize+q.gapSize,F.scale.value=q.scale}function H(F,q,A,j){if(F.diffuse.value.copy(q.color),F.opacity.value=q.opacity,F.size.value=q.size*A,F.scale.value=j*0.5,q.map)F.map.value=q.map,$(q.map,F.uvTransform);if(q.alphaMap)F.alphaMap.value=q.alphaMap,$(q.alphaMap,F.alphaMapTransform);if(q.alphaTest>0)F.alphaTest.value=q.alphaTest}function U(F,q){if(F.diffuse.value.copy(q.color),F.opacity.value=q.opacity,F.rotation.value=q.rotation,q.map)F.map.value=q.map,$(q.map,F.mapTransform);if(q.alphaMap)F.alphaMap.value=q.alphaMap,$(q.alphaMap,F.alphaMapTransform);if(q.alphaTest>0)F.alphaTest.value=q.alphaTest}function N(F,q){F.specular.value.copy(q.specular),F.shininess.value=Math.max(q.shininess,0.0001)}function E(F,q){if(q.gradientMap)F.gradientMap.value=q.gradientMap}function G(F,q){if(F.metalness.value=q.metalness,q.metalnessMap)F.metalnessMap.value=q.metalnessMap,$(q.metalnessMap,F.metalnessMapTransform);if(F.roughness.value=q.roughness,q.roughnessMap)F.roughnessMap.value=q.roughnessMap,$(q.roughnessMap,F.roughnessMapTransform);if(q.envMap)F.envMapIntensity.value=q.envMapIntensity}function D(F,q,A){if(F.ior.value=q.ior,q.sheen>0){if(F.sheenColor.value.copy(q.sheenColor).multiplyScalar(q.sheen),F.sheenRoughness.value=q.sheenRoughness,q.sheenColorMap)F.sheenColorMap.value=q.sheenColorMap,$(q.sheenColorMap,F.sheenColorMapTransform);if(q.sheenRoughnessMap)F.sheenRoughnessMap.value=q.sheenRoughnessMap,$(q.sheenRoughnessMap,F.sheenRoughnessMapTransform)}if(q.clearcoat>0){if(F.clearcoat.value=q.clearcoat,F.clearcoatRoughness.value=q.clearcoatRoughness,q.clearcoatMap)F.clearcoatMap.value=q.clearcoatMap,$(q.clearcoatMap,F.clearcoatMapTransform);if(q.clearcoatRoughnessMap)F.clearcoatRoughnessMap.value=q.clearcoatRoughnessMap,$(q.clearcoatRoughnessMap,F.clearcoatRoughnessMapTransform);if(q.clearcoatNormalMap){if(F.clearcoatNormalMap.value=q.clearcoatNormalMap,$(q.clearcoatNormalMap,F.clearcoatNormalMapTransform),F.clearcoatNormalScale.value.copy(q.clearcoatNormalScale),q.side===bJ)F.clearcoatNormalScale.value.negate()}}if(q.dispersion>0)F.dispersion.value=q.dispersion;if(q.retroreflectivity>0)F.retroreflectivity.value=q.retroreflectivity;if(q.iridescence>0){if(F.iridescence.value=q.iridescence,F.iridescenceIOR.value=q.iridescenceIOR,F.iridescenceThicknessMinimum.value=q.iridescenceThicknessRange[0],F.iridescenceThicknessMaximum.value=q.iridescenceThicknessRange[1],q.iridescenceMap)F.iridescenceMap.value=q.iridescenceMap,$(q.iridescenceMap,F.iridescenceMapTransform);if(q.iridescenceThicknessMap)F.iridescenceThicknessMap.value=q.iridescenceThicknessMap,$(q.iridescenceThicknessMap,F.iridescenceThicknessMapTransform)}if(q.transmission>0){if(F.transmission.value=q.transmission,F.transmissionSamplerMap.value=A.texture,F.transmissionSamplerSize.value.set(A.width,A.height),q.transmissionMap)F.transmissionMap.value=q.transmissionMap,$(q.transmissionMap,F.transmissionMapTransform);if(F.thickness.value=q.thickness,q.thicknessMap)F.thicknessMap.value=q.thicknessMap,$(q.thicknessMap,F.thicknessMapTransform);F.attenuationDistance.value=q.attenuationDistance,F.attenuationColor.value.copy(q.attenuationColor)}if(q.anisotropy>0){if(F.anisotropyVector.value.set(q.anisotropy*Math.cos(q.anisotropyRotation),q.anisotropy*Math.sin(q.anisotropyRotation)),q.anisotropyMap)F.anisotropyMap.value=q.anisotropyMap,$(q.anisotropyMap,F.anisotropyMapTransform)}if(F.specularIntensity.value=q.specularIntensity,F.specularColor.value.copy(q.specularColor),q.specularColorMap)F.specularColorMap.value=q.specularColorMap,$(q.specularColorMap,F.specularColorMapTransform);if(q.specularIntensityMap)F.specularIntensityMap.value=q.specularIntensityMap,$(q.specularIntensityMap,F.specularIntensityMapTransform)}function M(F,q){if(q.matcap)F.matcap.value=q.matcap}function I(F,q){let A=Q.get(q).light;F.referencePosition.value.setFromMatrixPosition(A.matrixWorld),F.nearDistance.value=A.shadow.camera.near,F.farDistance.value=A.shadow.camera.far}return{refreshFogUniforms:W,refreshMaterialUniforms:Z}}function UN(J,Q,$,W){let Z={},K={},Y=[],X=J.getParameter(J.MAX_UNIFORM_BUFFER_BINDINGS);function H(V,z){let P=z.program;W.uniformBlockBinding(V,P)}function U(V,z){let P=Z[V.id];if(P===void 0)F(V),P=N(V),Z[V.id]=P,V.addEventListener("dispose",A);let C=z.program;W.updateUBOMapping(V,C);let k=Q.render.frame;if(K[V.id]!==k)G(V),K[V.id]=k}function N(V){let z=E();V.__bindingPointIndex=z;let P=J.createBuffer(),C=V.__size,k=V.usage;return J.bindBuffer(J.UNIFORM_BUFFER,P),J.bufferData(J.UNIFORM_BUFFER,C,k),J.bindBuffer(J.UNIFORM_BUFFER,null),J.bindBufferBase(J.UNIFORM_BUFFER,z,P),P}function E(){for(let V=0;V<X;V++)if(Y.indexOf(V)===-1)return Y.push(V),V;return S0("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function G(V){let z=Z[V.id],P=V.uniforms,C=V.__cache;J.bindBuffer(J.UNIFORM_BUFFER,z);for(let k=0,B=P.length;k<B;k++){let g=P[k];if(Array.isArray(g))for(let f=0,h=g.length;f<h;f++)D(g[f],k,f,C);else D(g,k,0,C)}J.bindBuffer(J.UNIFORM_BUFFER,null)}function D(V,z,P,C){if(I(V,z,P,C)===!0){let{__offset:k,value:B}=V;if(Array.isArray(B)){let g=0;for(let f=0;f<B.length;f++){let h=B[f],a=q(h);if(M(h,V.__data,g),typeof h!=="number"&&typeof h!=="boolean"&&!h.isMatrix3&&!ArrayBuffer.isView(h))g+=a.storage/Float32Array.BYTES_PER_ELEMENT}}else M(B,V.__data,0);J.bufferSubData(J.UNIFORM_BUFFER,k,V.__data)}}function M(V,z,P){if(typeof V==="number"||typeof V==="boolean")z[0]=V;else if(V.isMatrix3)z[0]=V.elements[0],z[1]=V.elements[1],z[2]=V.elements[2],z[3]=0,z[4]=V.elements[3],z[5]=V.elements[4],z[6]=V.elements[5],z[7]=0,z[8]=V.elements[6],z[9]=V.elements[7],z[10]=V.elements[8],z[11]=0;else if(ArrayBuffer.isView(V))z.set(new V.constructor(V.buffer,V.byteOffset,z.length));else V.toArray(z,P)}function I(V,z,P,C){let k=V.value,B=z+"_"+P;if(C[B]===void 0){if(typeof k==="number"||typeof k==="boolean")C[B]=k;else if(ArrayBuffer.isView(k))C[B]=k.slice();else C[B]=k.clone();return!0}else{let g=C[B];if(typeof k==="number"||typeof k==="boolean"){if(g!==k)return C[B]=k,!0}else if(ArrayBuffer.isView(k))return!0;else if(g.equals(k)===!1)return g.copy(k),!0}return!1}function F(V){let z=V.uniforms,P=0,C=16;for(let B=0,g=z.length;B<g;B++){let f=Array.isArray(z[B])?z[B]:[z[B]];for(let h=0,a=f.length;h<a;h++){let _=f[h],d=Array.isArray(_.value)?_.value:[_.value];for(let o=0,p=d.length;o<p;o++){let Q0=d[o],c=q(Q0),r=P%C,J0=r%c.boundary,_0=r+J0;if(P+=J0,_0!==0&&C-_0<c.storage)P+=C-_0;_.__data=new Float32Array(c.storage/Float32Array.BYTES_PER_ELEMENT),_.__offset=P,P+=c.storage}}}let k=P%C;if(k>0)P+=C-k;return V.__size=P,V.__cache={},this}function q(V){let z={boundary:0,storage:0};if(typeof V==="number"||typeof V==="boolean")z.boundary=4,z.storage=4;else if(V.isVector2)z.boundary=8,z.storage=8;else if(V.isVector3||V.isColor)z.boundary=16,z.storage=12;else if(V.isVector4)z.boundary=16,z.storage=16;else if(V.isMatrix3)z.boundary=48,z.storage=48;else if(V.isMatrix4)z.boundary=64,z.storage=64;else if(V.isTexture)w0("WebGLRenderer: Texture samplers can not be part of an uniforms group.");else if(ArrayBuffer.isView(V))z.boundary=16,z.storage=V.byteLength;else w0("WebGLRenderer: Unsupported uniform value type.",V);return z}function A(V){let z=V.target;z.removeEventListener("dispose",A);let P=Y.indexOf(z.__bindingPointIndex);Y.splice(P,1),J.deleteBuffer(Z[z.id]),delete Z[z.id],delete K[z.id]}function j(){for(let V in Z)J.deleteBuffer(Z[V]);Y=[],Z={},K={}}return{bind:H,update:U,dispose:j}}var GN=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),D9=null;function NN(){if(D9===null)D9=new gQ(GN,16,16,t9,G9),D9.name="DFG_LUT",D9.minFilter=xJ,D9.magFilter=xJ,D9.wrapS=y7,D9.wrapT=y7,D9.generateMipmaps=!1,D9.needsUpdate=!0;return D9}class R${constructor(J={}){let{canvas:Q=KZ(),context:$=null,depth:W=!0,stencil:Z=!1,alpha:K=!1,antialias:Y=!1,premultipliedAlpha:X=!0,preserveDrawingBuffer:H=!1,powerPreference:U="default",failIfMajorPerformanceCaveat:N=!1,reversedDepthBuffer:E=!1,outputBufferType:G=Z9}=J;this.isWebGLRenderer=!0;let D;if($!==null){if(typeof WebGLRenderingContext<"u"&&$ instanceof WebGLRenderingContext)throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");D=$.getContextAttributes().alpha}else D=K;let M=G,I=new Set([r6,a6,o6]),F=new Set([Z9,b9,J7,S8,s6,i6]),q=new Uint32Array(4),A=new Int32Array(4),j=new v,V=null,z=null,P=[],C=[],k=null;this.domElement=Q,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=W9,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let B=this,g=!1,f=null,h=null,a=null,_=null;this._outputColorSpace=tW;let d=0,o=0,p=null,Q0=-1,c=null,r=new GJ,J0=new GJ,_0=null,z0=new C0(0),WJ=0,b0=Q.width,n=Q.height,$0=1,Z0=null,A0=null,T0=new GJ(0,0,b0,n),B0=new GJ(0,0,b0,n),DJ=!1,p0=new s7,l0=!1,a0=!1,d0=new YJ,IJ=new v,XJ=new GJ,vJ={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},EJ=!1;function OJ(){return p===null?$0:1}let T=$;function hJ(R,S){return Q.getContext(R,S)}let s0,UJ,L,O,w,m,e,K0,H0,u,i,D0,V0,U0,W0,I0,P0,c0,y,Y0,s,X0,E0;try{let R={alpha:!0,depth:W,stencil:Z,antialias:Y,premultipliedAlpha:X,preserveDrawingBuffer:H,powerPreference:U,failIfMajorPerformanceCaveat:N};if("setAttribute"in Q)Q.setAttribute("data-engine",`three.js r${XW}`);if(Q.addEventListener("webglcontextlost",f0,!1),Q.addEventListener("webglcontextrestored",ZJ,!1),Q.addEventListener("webglcontextcreationerror",i0,!1),T===null){if(T=hJ("webgl2",R),T===null)if(hJ("webgl2"))throw Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.");else throw Error("THREE.WebGLRenderer: Error creating WebGL context.")}t()}catch(R){throw Q.removeEventListener("webglcontextlost",f0,!1),Q.removeEventListener("webglcontextrestored",ZJ,!1),Q.removeEventListener("webglcontextcreationerror",i0,!1),S0("WebGLRenderer: "+R.message),R}function t(){if(s0=new kU(T),s0.init(),s=new ZN(T,s0),UJ=new HU(T,s0,J,s),L=new $N(T,s0),UJ.reversedDepthBuffer&&E)L.buffers.depth.setReversed(!0);h=T.createFramebuffer(),a=T.createFramebuffer(),_=T.createFramebuffer(),O=new VU(T),w=new lG,m=new WN(T,s0,L,w,UJ,s,O),e=new RU(B),K0=new IY(T),X0=new YU(T,K0),H0=new MU(T,K0,O,X0),u=new IU(T,H0,K0,X0,O),c0=new BU(T,UJ,m),W0=new UU(w),i=new mG(B,e,s0,UJ,X0,W0),D0=new HN(B,w),V0=new uG,U0=new aG(s0),P0=new KU(B,e,L,u,D,X),I0=new QN(B,u,UJ),E0=new UN(T,O,UJ,L),y=new XU(T,s0,O),Y0=new LU(T,s0,O),O.programs=i.programs,B.capabilities=UJ,B.extensions=s0,B.properties=w,B.renderLists=V0,B.shadowMap=I0,B.state=L,B.info=O}if(M!==Z9)k=new AU(M,Q.width,Q.height,Y,W,Z);let N0=new sZ(B,T);this.xr=N0,this.getContext=function(){return T},this.getContextAttributes=function(){return T.getContextAttributes()},this.forceContextLoss=function(){let R=s0.get("WEBGL_lose_context");if(R)R.loseContext()},this.forceContextRestore=function(){let R=s0.get("WEBGL_lose_context");if(R)R.restoreContext()},this.getPixelRatio=function(){return $0},this.setPixelRatio=function(R){if(R===void 0)return;$0=R,this.setSize(b0,n,!1)},this.getSize=function(R){return R.set(b0,n)},this.setSize=function(R,S,l=!0){if(N0.isPresenting){w0("WebGLRenderer: Can't change size while VR device is presenting.");return}if(b0=R,n=S,Q.width=Math.floor(R*$0),Q.height=Math.floor(S*$0),l===!0)Q.style.width=R+"px",Q.style.height=S+"px";if(k!==null)k.setSize(Q.width,Q.height);this.setViewport(0,0,R,S)},this.getDrawingBufferSize=function(R){return R.set(b0*$0,n*$0).floor()},this.setDrawingBufferSize=function(R,S,l){b0=R,n=S,$0=l,Q.width=Math.floor(R*l),Q.height=Math.floor(S*l),this.setViewport(0,0,R,S)},this.setEffects=function(R){if(M===Z9){S0("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(R){for(let S=0;S<R.length;S++)if(R[S].isOutputPass===!0){w0("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}k.setEffects(R||[])},this.getCurrentViewport=function(R){return R.copy(r)},this.getViewport=function(R){return R.copy(T0)},this.setViewport=function(R,S,l,b){if(R.isVector4)T0.set(R.x,R.y,R.z,R.w);else T0.set(R,S,l,b);L.viewport(r.copy(T0).multiplyScalar($0).round())},this.getScissor=function(R){return R.copy(B0)},this.setScissor=function(R,S,l,b){if(R.isVector4)B0.set(R.x,R.y,R.z,R.w);else B0.set(R,S,l,b);L.scissor(J0.copy(B0).multiplyScalar($0).round())},this.getScissorTest=function(){return DJ},this.setScissorTest=function(R){L.setScissorTest(DJ=R)},this.setOpaqueSort=function(R){Z0=R},this.setTransparentSort=function(R){A0=R},this.getClearColor=function(R){return R.copy(P0.getClearColor())},this.setClearColor=function(){P0.setClearColor(...arguments)},this.getClearAlpha=function(){return P0.getClearAlpha()},this.setClearAlpha=function(){P0.setClearAlpha(...arguments)},this.clear=function(R=!0,S=!0,l=!0){let b=0;if(R){let x=!1;if(p!==null){let F0=p.texture.format;x=I.has(F0)}if(x){let F0=p.texture.type,R0=F.has(F0),q0=P0.getClearColor(),k0=P0.getClearAlpha(),L0=q0.r,v0=q0.g,g0=q0.b;if(R0)q[0]=L0,q[1]=v0,q[2]=g0,q[3]=k0,T.clearBufferuiv(T.COLOR,0,q);else A[0]=L0,A[1]=v0,A[2]=g0,A[3]=k0,T.clearBufferiv(T.COLOR,0,A)}else b|=T.COLOR_BUFFER_BIT}if(S)b|=T.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0);if(l)b|=T.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295);if(b!==0)T.clear(b)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(R){R.setRenderer(this),f=R},this.dispose=function(){Q.removeEventListener("webglcontextlost",f0,!1),Q.removeEventListener("webglcontextrestored",ZJ,!1),Q.removeEventListener("webglcontextcreationerror",i0,!1),P0.dispose(),V0.dispose(),U0.dispose(),w.dispose(),e.dispose(),u.dispose(),X0.dispose(),E0.dispose(),i.dispose(),N0.dispose(),N0.removeEventListener("sessionstart",T$),N0.removeEventListener("sessionend",S$),l9.stop()};function f0(R){R.preventDefault(),yQ("WebGLRenderer: Context Lost."),g=!0}function ZJ(){yQ("WebGLRenderer: Context Restored."),g=!1;let R=O.autoReset,S=I0.enabled,l=I0.autoUpdate,b=I0.needsUpdate,x=I0.type;t(),O.autoReset=R,I0.enabled=S,I0.autoUpdate=l,I0.needsUpdate=b,I0.type=x}function i0(R){S0("WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function Y9(R){let S=R.target;S.removeEventListener("dispose",Y9),O9(S)}function O9(R){VK(R),w.remove(R)}function VK(R){let S=w.get(R).programs;if(S!==void 0){if(S.forEach(function(l){i.releaseProgram(l)}),R.isShaderMaterial)i.releaseShaderCache(R)}}this.renderBufferDirect=function(R,S,l,b,x,F0){if(S===null)S=vJ;let R0=x.isMesh&&x.matrixWorld.determinantAffine()<0,q0=zK(R,S,l,b,x);L.setMaterial(b,R0);let k0=l.index,L0=1;if(b.wireframe===!0){if(k0=H0.getWireframeAttribute(l),k0===void 0)return;L0=2}let v0=l.drawRange,g0=l.attributes.position,M0=v0.start*L0,o0=(v0.start+v0.count)*L0;if(F0!==null)M0=Math.max(M0,F0.start*L0),o0=Math.min(o0,(F0.start+F0.count)*L0);if(k0!==null)M0=Math.max(M0,0),o0=Math.min(o0,k0.count);else if(g0!==void 0&&g0!==null)M0=Math.max(M0,0),o0=Math.min(o0,g0.count);let qJ=o0-M0;if(qJ<0||qJ===1/0)return;X0.setup(x,b,q0,l,k0);let HJ,QJ=y;if(k0!==null)HJ=K0.get(k0),QJ=Y0,QJ.setIndex(HJ);if(x.isMesh)if(b.wireframe===!0)L.setLineWidth(b.wireframeLinewidth*OJ()),QJ.setMode(T.LINES);else QJ.setMode(T.TRIANGLES);else if(x.isLine){let AJ=b.linewidth;if(AJ===void 0)AJ=1;if(L.setLineWidth(AJ*OJ()),x.isLineSegments)QJ.setMode(T.LINES);else if(x.isLineLoop)QJ.setMode(T.LINE_LOOP);else QJ.setMode(T.LINE_STRIP)}else if(x.isPoints)QJ.setMode(T.POINTS);else if(x.isSprite)QJ.setMode(T.TRIANGLES);if(x.isBatchedMesh)if(!s0.get("WEBGL_multi_draw")){let{_multiDrawStarts:AJ,_multiDrawCounts:O0,_multiDrawCount:jJ}=x,u0=k0?K0.get(k0).bytesPerElement:1,nJ=w.get(b).currentProgram.getUniforms();for(let X9=0;X9<jJ;X9++)nJ.setValue(T,"_gl_DrawID",X9),QJ.render(AJ[X9]/u0,O0[X9])}else QJ.renderMultiDraw(x._multiDrawStarts,x._multiDrawCounts,x._multiDrawCount);else if(x.isInstancedMesh)QJ.renderInstances(M0,qJ,x.count);else if(l.isInstancedBufferGeometry){let AJ=l._maxInstanceCount!==void 0?l._maxInstanceCount:1/0,O0=Math.min(l.instanceCount,AJ);QJ.renderInstances(M0,qJ,O0)}else QJ.render(M0,qJ)};function _$(R,S,l,b){if(f!==null&&R.isNodeMaterial)f.setObject(b,R);if(l0===!0)W0.setState(R,l,!1);if(R.transparent===!0&&R.side===uJ&&R.forceSinglePass===!1)R.side=bJ,R.needsUpdate=!0,N7(R,S,b),R.side=w8,R.needsUpdate=!0,N7(R,S,b),R.side=uJ;else N7(R,S,b)}this.compile=function(R,S,l=null){if(l===null)l=R;if(f!==null)f.renderStart(R,S,l);if(z=U0.get(l),z.init(S),C.push(z),l.traverseVisible(function(x){if(x.isLight&&x.layers.test(S.layers)){if(z.pushLight(x),x.castShadow)z.pushShadow(x)}}),R!==l)R.traverseVisible(function(x){if(x.isLight&&x.layers.test(S.layers)){if(z.pushLight(x),x.castShadow)z.pushShadow(x)}});if(z.setupLights(),f!==null)f.updateLights(z.state.lightsArray);if(a0=this.localClippingEnabled,l0=W0.init(this.clippingPlanes,a0),l0===!0)W0.setGlobalState(this.clippingPlanes,S);if(f!==null)I0.render(z.state.shadowsArray,l,S);let b=new Set;if(R.traverse(function(x){if(!(x.isMesh||x.isPoints||x.isLine||x.isSprite))return;let F0=x.material;if(F0)if(Array.isArray(F0))for(let R0=0;R0<F0.length;R0++){let q0=F0[R0];_$(q0,l,S,x),b.add(q0)}else _$(F0,l,S,x),b.add(F0)}),z=C.pop(),f!==null)f.renderEnd();return b},this.compileAsync=function(R,S,l=null){let b=this.compile(R,S,l);return new Promise((x)=>{function F0(){if(b.forEach(function(R0){let k0=w.get(R0).currentProgram;if(k0===void 0||k0.isReady())b.delete(R0)}),b.size===0){x(R);return}setTimeout(F0,10)}if(s0.get("KHR_parallel_shader_compile")!==null)F0();else setTimeout(F0,10)})};let N6=null;function BK(R){if(N6)N6(R)}function T$(){l9.stop()}function S$(){l9.start()}let l9=new vZ;if(l9.setAnimationLoop(BK),typeof self<"u")l9.setContext(self);this.setAnimationLoop=function(R){N6=R,N0.setAnimationLoop(R),R===null?l9.stop():l9.start()},N0.addEventListener("sessionstart",T$),N0.addEventListener("sessionend",S$),this.render=function(R,S){if(S!==void 0&&S.isCamera!==!0){S0("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(g===!0)return;if(f!==null)f.renderStart(R,S);let l=N0.enabled===!0&&N0.isPresenting===!0,b=k!==null&&(p===null||l)&&k.begin(B,p);if(R.matrixWorldAutoUpdate===!0)R.updateMatrixWorld();if(S.parent===null&&S.matrixWorldAutoUpdate===!0)S.updateMatrixWorld();if(N0.enabled===!0&&N0.isPresenting===!0&&(k===null||k.isCompositing()===!1)){if(N0.cameraAutoUpdate===!0)N0.updateCamera(S);S=N0.getCamera()}if(R.isScene===!0)R.onBeforeRender(B,R,S,p);if(z=U0.get(R,C.length),z.init(S),z.state.textureUnits=m.getTextureUnits(),C.push(z),d0.multiplyMatrices(S.projectionMatrix,S.matrixWorldInverse),p0.setFromProjectionMatrix(d0,jQ,S.reversedDepth),a0=this.localClippingEnabled,l0=W0.init(this.clippingPlanes,a0),V=V0.get(R,P.length),V.init(),P.push(V),N0.enabled===!0&&N0.isPresenting===!0){let R0=B.xr.getDepthSensingMesh();if(R0!==null)q6(R0,S,-1/0,B.sortObjects)}if(q6(R,S,0,B.sortObjects),V.finish(),f!==null)f.updateLights(z.state.lightsArray);if(B.sortObjects===!0)V.sort(Z0,A0);if(EJ=N0.enabled===!1||N0.isPresenting===!1||N0.hasDepthSensing()===!1,EJ)P0.addToRenderList(V,R);if(this.info.render.frame++,this.info.autoReset===!0)this.info.reset();if(l0===!0)W0.beginShadows();let x=z.state.shadowsArray;if(I0.render(x,R,S),l0===!0)W0.endShadows();if((b&&k.hasRenderPass())===!1){let{opaque:R0,transmissive:q0}=V;if(z.setupLights(),S.isArrayCamera){let k0=S.cameras;if(q0.length>0)for(let L0=0,v0=k0.length;L0<v0;L0++){let g0=k0[L0];y$(R0,q0,R,g0)}if(EJ)P0.render(R);for(let L0=0,v0=k0.length;L0<v0;L0++){let g0=k0[L0];j$(V,R,g0,g0.viewport)}}else{if(q0.length>0)y$(R0,q0,R,S);if(EJ)P0.render(R);j$(V,R,S)}}if(p!==null&&o===0)m.updateMultisampleRenderTarget(p),m.updateRenderTargetMipmap(p);if(b)k.end(B);if(R.isScene===!0)R.onAfterRender(B,R,S);if(X0.resetDefaultState(),Q0=-1,c=null,C.pop(),C.length>0){if(z=C[C.length-1],m.setTextureUnits(z.state.textureUnits),l0===!0)W0.setGlobalState(B.clippingPlanes,z.state.camera)}else z=null;if(P.pop(),P.length>0)V=P[P.length-1];else V=null;if(f!==null)f.renderEnd()};function q6(R,S,l,b){if(R.visible===!1)return;if(R.layers.test(S.layers)){if(R.isGroup)l=R.renderOrder;else if(R.isLOD){if(R.autoUpdate===!0)R.update(S)}else if(R.isLightProbeGrid)z.pushLightProbeGrid(R);else if(R.isLight){if(z.pushLight(R),R.castShadow)z.pushShadow(R)}else if(R.isSprite){if(!R.frustumCulled||R.intersectsFrustum(p0)){if(b)XJ.setFromMatrixPosition(R.matrixWorld).applyMatrix4(d0);let R0=u.update(R),q0=R.material;if(q0.visible)V.push(R,R0,q0,l,XJ.z,null,S)}}else if(R.isMesh||R.isLine||R.isPoints){if(!R.frustumCulled||R.intersectsFrustum(p0)){let R0=u.update(R),q0=R.material;if(b){if(R.boundingSphere!==void 0){if(R.boundingSphere===null)R.computeBoundingSphere();XJ.copy(R.boundingSphere.center)}else{if(R0.boundingSphere===null)R0.computeBoundingSphere();XJ.copy(R0.boundingSphere.center)}XJ.applyMatrix4(R.matrixWorld).applyMatrix4(d0)}if(Array.isArray(q0)){let k0=R0.groups;for(let L0=0,v0=k0.length;L0<v0;L0++){let g0=k0[L0],M0=q0[g0.materialIndex];if(M0&&M0.visible)V.push(R,R0,M0,l,XJ.z,g0,S)}}else if(q0.visible)V.push(R,R0,q0,l,XJ.z,null,S)}}}let F0=R.children;for(let R0=0,q0=F0.length;R0<q0;R0++)q6(F0[R0],S,l,b)}function j$(R,S,l,b){let{opaque:x,transmissive:F0,transparent:R0}=R;if(z.setupLightsView(l),l0===!0)W0.setGlobalState(B.clippingPlanes,l);if(b)L.viewport(r.copy(b));if(x.length>0)G7(x,S,l);if(F0.length>0)G7(F0,S,l);if(R0.length>0)G7(R0,S,l);L.buffers.depth.setTest(!0),L.buffers.depth.setMask(!0),L.buffers.color.setMask(!0),L.setPolygonOffset(!1)}function y$(R,S,l,b){if((l.isScene===!0?l.overrideMaterial:null)!==null)return;if(z.state.transmissionRenderTarget[b.id]===void 0){let M0=s0.has("EXT_color_buffer_half_float")||s0.has("EXT_color_buffer_float");z.state.transmissionRenderTarget[b.id]=new cJ(1,1,{generateMipmaps:!0,type:M0?G9:Z9,minFilter:o9,samples:Math.max(4,UJ.samples),stencilBuffer:Z,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:m0.workingColorSpace})}let F0=z.state.transmissionRenderTarget[b.id],R0=b.viewport||r;F0.setSize(R0.z*B.transmissionResolutionScale,R0.w*B.transmissionResolutionScale);let q0=B.getRenderTarget(),k0=B.getActiveCubeFace(),L0=B.getActiveMipmapLevel();if(B.setRenderTarget(F0),B.getClearColor(z0),WJ=B.getClearAlpha(),WJ<1)B.setClearColor(16777215,0.5);if(B.clear(),EJ)P0.render(l);let v0=B.toneMapping;B.toneMapping=W9;let g0=b.viewport;if(b.viewport!==void 0)b.viewport=void 0;if(z.setupLightsView(b),l0===!0)W0.setGlobalState(B.clippingPlanes,b);if(G7(R,l,b),m.updateMultisampleRenderTarget(F0),m.updateRenderTargetMipmap(F0),s0.has("WEBGL_multisampled_render_to_texture")===!1){let M0=!1;for(let o0=0,qJ=S.length;o0<qJ;o0++){let HJ=S[o0],{object:QJ,geometry:AJ,material:O0,group:jJ}=HJ;if(O0.side===uJ&&QJ.layers.test(b.layers)){let u0=O0.side;O0.side=bJ,O0.needsUpdate=!0,f$(QJ,l,b,AJ,O0,jJ),O0.side=u0,O0.needsUpdate=!0,M0=!0}}if(M0===!0)m.updateMultisampleRenderTarget(F0),m.updateRenderTargetMipmap(F0)}if(B.setRenderTarget(q0,k0,L0),B.setClearColor(z0,WJ),g0!==void 0)b.viewport=g0;B.toneMapping=v0}function G7(R,S,l){let b=S.isScene===!0?S.overrideMaterial:null;for(let x=0,F0=R.length;x<F0;x++){let R0=R[x],{object:q0,geometry:k0,group:L0}=R0,v0=R0.material;if(v0.allowOverride===!0&&b!==null)v0=b;if(q0.layers.test(l.layers))f$(q0,S,l,k0,v0,L0)}}function f$(R,S,l,b,x,F0){if(f!==null&&x.isNodeMaterial)f.setObject(R,x);if(R.onBeforeRender(B,S,l,b,x,F0),R.modelViewMatrix.multiplyMatrices(l.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),x.onBeforeRender(B,S,l,b,R,F0),x.transparent===!0&&x.side===uJ&&x.forceSinglePass===!1)x.side=bJ,x.needsUpdate=!0,B.renderBufferDirect(l,S,b,x,R,F0),x.side=w8,x.needsUpdate=!0,B.renderBufferDirect(l,S,b,x,R,F0),x.side=uJ;else B.renderBufferDirect(l,S,b,x,R,F0);R.onAfterRender(B,S,l,b,x,F0)}function N7(R,S,l){if(S.isScene!==!0)S=vJ;let b=w.get(R),x=z.state.lights,F0=z.state.shadowsArray,R0=x.state.version,q0=i.getParameters(R,x.state,F0,S,l,z.state.lightProbeGridArray),k0=i.getProgramCacheKey(q0),L0=b.programs;b.environment=R.isMeshStandardMaterial||R.isMeshLambertMaterial||R.isMeshPhongMaterial?S.environment:null,b.fog=S.fog;let v0=R.isMeshStandardMaterial||R.isMeshLambertMaterial&&!R.envMap||R.isMeshPhongMaterial&&!R.envMap;if(b.envMap=e.get(R.envMap||b.environment,v0),b.envMapRotation=b.environment!==null&&R.envMap===null?S.environmentRotation:R.envMapRotation,L0===void 0)R.addEventListener("dispose",Y9),L0=new Map,b.programs=L0;let g0=L0.get(k0);if(g0!==void 0){if(b.currentProgram===g0&&b.lightsStateVersion===R0)return h$(R,q0),g0}else{if(q0.uniforms=i.getUniforms(R),f!==null&&R.isNodeMaterial)f.build(R,l,q0);R.onBeforeCompile(q0,B),g0=i.acquireProgram(q0,k0),L0.set(k0,g0),b.uniforms=q0.uniforms}let M0=b.uniforms;if(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)M0.clippingPlanes=W0.uniform;if(h$(R,q0),b.needsLights=PK(R),b.lightsStateVersion=R0,b.needsLights)M0.ambientLightColor.value=x.state.ambient,M0.lightProbe.value=x.state.probe,M0.sunLights.value=x.state.sun,M0.sunLightShadows.value=x.state.sunShadow,M0.directionalLights.value=x.state.directional,M0.directionalLightShadows.value=x.state.directionalShadow,M0.spotLights.value=x.state.spot,M0.spotLightShadows.value=x.state.spotShadow,M0.rectAreaLights.value=x.state.rectArea,M0.ltc_1.value=x.state.rectAreaLTC1,M0.ltc_2.value=x.state.rectAreaLTC2,M0.pointLights.value=x.state.point,M0.pointLightShadows.value=x.state.pointShadow,M0.hemisphereLights.value=x.state.hemi,M0.sunShadowMatrix.value=x.state.sunShadowMatrix,M0.sunShadowCascade.value=x.state.sunShadowCascade,M0.directionalShadowMatrix.value=x.state.directionalShadowMatrix,M0.spotLightMatrix.value=x.state.spotLightMatrix,M0.spotLightMap.value=x.state.spotLightMap,M0.pointShadowMatrix.value=x.state.pointShadowMatrix;return b.lightProbeGrid=z.state.lightProbeGridArray.length>0,b.currentProgram=g0,b.uniformsList=null,g0}function v$(R){if(R.uniformsList===null){let S=R.currentProgram.getUniforms();R.uniformsList=U7.seqWithValue(S.seq,R.uniforms)}return R.uniformsList}function h$(R,S){let l=w.get(R);l.outputColorSpace=S.outputColorSpace,l.batching=S.batching,l.batchingColor=S.batchingColor,l.instancing=S.instancing,l.instancingColor=S.instancingColor,l.instancingMorph=S.instancingMorph,l.skinning=S.skinning,l.morphTargets=S.morphTargets,l.morphNormals=S.morphNormals,l.morphColors=S.morphColors,l.morphTargetsCount=S.morphTargetsCount,l.numClippingPlanes=S.numClippingPlanes,l.numIntersection=S.numClipIntersection,l.vertexAlphas=S.vertexAlphas,l.vertexTangents=S.vertexTangents,l.toneMapping=S.toneMapping}function IK(R,S){if(R.length===0)return null;if(R.length===1)return R[0].texture!==null?R[0]:null;j.setFromMatrixPosition(S.matrixWorld);for(let l=0,b=R.length;l<b;l++){let x=R[l];if(x.texture!==null&&x.boundingBox.containsPoint(j))return x}return null}function zK(R,S,l,b,x){if(S.isScene!==!0)S=vJ;m.resetTextureUnits();let F0=S.fog,R0=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?S.environment:null,q0=p===null?B.outputColorSpace:p.isXRRenderTarget===!0?p.texture.colorSpace:m0.workingColorSpace,k0=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap,L0=e.get(b.envMap||R0,k0),v0=b.vertexColors===!0&&!!l.attributes.color&&l.attributes.color.itemSize===4,g0=!!l.attributes.tangent&&(!!b.normalMap||b.anisotropy>0),M0=!!l.morphAttributes.position,o0=!!l.morphAttributes.normal,qJ=!!l.morphAttributes.color,HJ=W9;if(b.toneMapped){if(p===null||p.isXRRenderTarget===!0)HJ=B.toneMapping}let QJ=l.morphAttributes.position||l.morphAttributes.normal||l.morphAttributes.color,AJ=QJ!==void 0?QJ.length:0,O0=w.get(b),jJ=z.state.lights;if(l0===!0){if(a0===!0||R!==c){let KJ=R===c&&b.id===Q0;W0.setState(b,R,KJ)}}let u0=!1;if(b.version===O0.__version){if(O0.needsLights&&O0.lightsStateVersion!==jJ.state.version)u0=!0;else if(O0.outputColorSpace!==q0)u0=!0;else if(x.isBatchedMesh&&O0.batching===!1)u0=!0;else if(!x.isBatchedMesh&&O0.batching===!0)u0=!0;else if(x.isBatchedMesh&&O0.batchingColor===!0&&x._colorsTexture===null)u0=!0;else if(x.isBatchedMesh&&O0.batchingColor===!1&&x._colorsTexture!==null)u0=!0;else if(x.isInstancedMesh&&O0.instancing===!1)u0=!0;else if(!x.isInstancedMesh&&O0.instancing===!0)u0=!0;else if(x.isSkinnedMesh&&O0.skinning===!1)u0=!0;else if(!x.isSkinnedMesh&&O0.skinning===!0)u0=!0;else if(x.isInstancedMesh&&O0.instancingColor===!0&&x.instanceColor===null)u0=!0;else if(x.isInstancedMesh&&O0.instancingColor===!1&&x.instanceColor!==null)u0=!0;else if(x.isInstancedMesh&&O0.instancingMorph===!0&&x.morphTexture===null)u0=!0;else if(x.isInstancedMesh&&O0.instancingMorph===!1&&x.morphTexture!==null)u0=!0;else if(O0.envMap!==L0)u0=!0;else if(b.fog===!0&&O0.fog!==F0)u0=!0;else if(O0.numClippingPlanes!==void 0&&(O0.numClippingPlanes!==W0.numPlanes||O0.numIntersection!==W0.numIntersection))u0=!0;else if(O0.vertexAlphas!==v0)u0=!0;else if(O0.vertexTangents!==g0)u0=!0;else if(O0.morphTargets!==M0)u0=!0;else if(O0.morphNormals!==o0)u0=!0;else if(O0.morphColors!==qJ)u0=!0;else if(O0.toneMapping!==HJ)u0=!0;else if(O0.morphTargetsCount!==AJ)u0=!0;else if(!!O0.lightProbeGrid!==z.state.lightProbeGridArray.length>0)u0=!0}else u0=!0,O0.__version=b.version;let nJ=O0.currentProgram;if(u0===!0){if(nJ=N7(b,S,x),f&&b.isNodeMaterial)f.onUpdateProgram(b,nJ,O0)}let X9=!1,A9=!1,X8=!1,JJ=nJ.getUniforms(),NJ=O0.uniforms;if(L.useProgram(nJ.program))X9=!0,A9=!0,X8=!0;if(b.id!==Q0)Q0=b.id,A9=!0;if(O0.needsLights){let KJ=IK(z.state.lightProbeGridArray,x);if(O0.lightProbeGrid!==KJ)O0.lightProbeGrid=KJ,A9=!0}if(X9||c!==R){if(L.buffers.depth.getReversed()&&R.reversedDepth!==!0)R._reversedDepth=!0,R.updateProjectionMatrix();JJ.setValue(T,"projectionMatrix",R.projectionMatrix),JJ.setValue(T,"viewMatrix",R.matrixWorldInverse);let C9=JJ.map.cameraPosition;if(C9!==void 0)C9.setValue(T,IJ.setFromMatrixPosition(R.matrixWorld));if(UJ.logarithmicDepthBuffer)JJ.setValue(T,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2));if(b.isMeshPhongMaterial||b.isMeshToonMaterial||b.isMeshLambertMaterial||b.isMeshBasicMaterial||b.isMeshStandardMaterial||b.isShaderMaterial)JJ.setValue(T,"isOrthographic",R.isOrthographicCamera===!0);if(c!==R)c=R,A9=!0,X8=!0}if(O0.needsLights){if(jJ.state.sunShadowMap.length>0)JJ.setValue(T,"sunShadowMap",jJ.state.sunShadowMap,m);if(jJ.state.directionalShadowMap.length>0)JJ.setValue(T,"directionalShadowMap",jJ.state.directionalShadowMap,m);if(jJ.state.spotShadowMap.length>0)JJ.setValue(T,"spotShadowMap",jJ.state.spotShadowMap,m);if(jJ.state.pointShadowMap.length>0)JJ.setValue(T,"pointShadowMap",jJ.state.pointShadowMap,m)}if(x.isSkinnedMesh){JJ.setOptional(T,x,"bindMatrix"),JJ.setOptional(T,x,"bindMatrixInverse");let KJ=x.skeleton;if(KJ){if(KJ.boneTexture===null)KJ.computeBoneTexture();JJ.setValue(T,"boneTexture",KJ.boneTexture,m)}}if(x.isBatchedMesh){if(JJ.setOptional(T,x,"batchingTexture"),JJ.setValue(T,"batchingTexture",x._matricesTexture,m),JJ.setOptional(T,x,"batchingIdTexture"),JJ.setValue(T,"batchingIdTexture",x._indirectTexture,m),JJ.setOptional(T,x,"batchingColorTexture"),x._colorsTexture!==null)JJ.setValue(T,"batchingColorTexture",x._colorsTexture,m)}let P9=l.morphAttributes;if(P9.position!==void 0||P9.normal!==void 0||P9.color!==void 0)c0.update(x,l,nJ);if(A9||O0.receiveShadow!==x.receiveShadow)O0.receiveShadow=x.receiveShadow,JJ.setValue(T,"receiveShadow",x.receiveShadow);if((b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial)&&b.envMap===null&&S.environment!==null)NJ.envMapIntensity.value=S.environmentIntensity;if(NJ.dfgLUT!==void 0)NJ.dfgLUT.value=NN();if(A9){if(JJ.setValue(T,"toneMappingExposure",B.toneMappingExposure),O0.needsLights)AK(NJ,X8);if(F0&&b.fog===!0)D0.refreshFogUniforms(NJ,F0);if(D0.refreshMaterialUniforms(NJ,b,$0,n,z.state.transmissionRenderTarget[R.id]),O0.needsLights&&O0.lightProbeGrid){let KJ=O0.lightProbeGrid;NJ.probesSH.value=KJ.texture,NJ.probesMin.value.copy(KJ.boundingBox.min),NJ.probesMax.value.copy(KJ.boundingBox.max),NJ.probesResolution.value.copy(KJ.resolution)}U7.upload(T,v$(O0),NJ,m)}if(b.isShaderMaterial&&b.uniformsNeedUpdate===!0)U7.upload(T,v$(O0),NJ,m),b.uniformsNeedUpdate=!1;if(b.isSpriteMaterial)JJ.setValue(T,"center",x.center);if(JJ.setValue(T,"modelViewMatrix",x.modelViewMatrix),JJ.setValue(T,"normalMatrix",x.normalMatrix),JJ.setValue(T,"modelMatrix",x.matrixWorld),b.uniformsGroups!==void 0){let KJ=b.uniformsGroups;for(let C9=0,H8=KJ.length;C9<H8;C9++){let x$=KJ[C9];E0.update(x$,nJ),E0.bind(x$,nJ)}}return nJ}function AK(R,S){R.ambientLightColor.needsUpdate=S,R.lightProbe.needsUpdate=S,R.sunLights.needsUpdate=S,R.sunLightShadows.needsUpdate=S,R.directionalLights.needsUpdate=S,R.directionalLightShadows.needsUpdate=S,R.pointLights.needsUpdate=S,R.pointLightShadows.needsUpdate=S,R.spotLights.needsUpdate=S,R.spotLightShadows.needsUpdate=S,R.rectAreaLights.needsUpdate=S,R.hemisphereLights.needsUpdate=S}function PK(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return d},this.getActiveMipmapLevel=function(){return o},this.getRenderTarget=function(){return p},this.setRenderTargetTextures=function(R,S,l){let b=w.get(R);if(b.__autoAllocateDepthBuffer=R.resolveDepthBuffer===!1,b.__autoAllocateDepthBuffer===!1)b.__useRenderToTexture=!1;w.get(R.texture).__webglTexture=S,w.get(R.depthTexture).__webglTexture=b.__autoAllocateDepthBuffer?void 0:l,b.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(R,S){let l=w.get(R);l.__webglFramebuffer=S,l.__useDefaultFramebuffer=S===void 0},this.setRenderTarget=function(R,S=0,l=0){p=R,d=S,o=l;let b=null,x=!1,F0=!1;if(R){let q0=w.get(R);if(q0.__useDefaultFramebuffer!==void 0){L.bindFramebuffer(T.FRAMEBUFFER,q0.__webglFramebuffer),r.copy(R.viewport),J0.copy(R.scissor),_0=R.scissorTest,L.viewport(r),L.scissor(J0),L.setScissorTest(_0),Q0=-1;return}else if(q0.__webglFramebuffer===void 0)m.setupRenderTarget(R);else if(q0.__hasExternalTextures)m.rebindTextures(R,w.get(R.texture).__webglTexture,w.get(R.depthTexture).__webglTexture);else if(R.depthBuffer){let v0=R.depthTexture;if(q0.__boundDepthTexture!==v0){if(v0!==null&&w.has(v0)&&(R.width!==v0.image.width||R.height!==v0.image.height))throw Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");m.setupDepthRenderbuffer(R)}}let k0=R.texture;if(k0.isData3DTexture||k0.isDataArrayTexture||k0.isCompressedArrayTexture)F0=!0;let L0=w.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget){if(Array.isArray(L0[S]))b=L0[S][l];else b=L0[S];x=!0}else if(R.samples>0&&m.useMultisampledRTT(R)===!1)b=w.get(R).__webglMultisampledFramebuffer;else if(Array.isArray(L0))b=L0[l];else b=L0;r.copy(R.viewport),J0.copy(R.scissor),_0=R.scissorTest}else r.copy(T0).multiplyScalar($0).floor(),J0.copy(B0).multiplyScalar($0).floor(),_0=DJ;if(l!==0)b=h;if(L.bindFramebuffer(T.FRAMEBUFFER,b))L.drawBuffers(R,b);if(L.viewport(r),L.scissor(J0),L.setScissorTest(_0),x){let q0=w.get(R.texture);T.framebufferTexture2D(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_CUBE_MAP_POSITIVE_X+S,q0.__webglTexture,l)}else if(F0){let q0=S;for(let k0=0;k0<R.textures.length;k0++){let L0=w.get(R.textures[k0]);T.framebufferTextureLayer(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0+k0,L0.__webglTexture,l,q0)}}else if(R!==null&&l!==0){let q0=w.get(R.texture);T.framebufferTexture2D(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_2D,q0.__webglTexture,l)}Q0=-1};function b$(R){let S=w.get(R);if(S.__readFormat!==R.format||S.__readType!==R.type)S.__readFormat=R.format,S.__readType=R.type,S.__formatReadable=UJ.textureFormatReadable(R.format),S.__typeReadable=UJ.textureTypeReadable(R.type);return S}if(this.readRenderTargetPixels=function(R,S,l,b,x,F0,R0,q0=0){if(!(R&&R.isWebGLRenderTarget)){S0("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let k0=w.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&R0!==void 0)k0=k0[R0];if(k0){L.bindFramebuffer(T.FRAMEBUFFER,k0);try{let L0=R.textures[q0],v0=L0.format,g0=L0.type;if(R.textures.length>1)T.readBuffer(T.COLOR_ATTACHMENT0+q0);let M0=b$(L0);if(M0.__formatReadable===!1){S0("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(M0.__typeReadable===!1){S0("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}if(S>=0&&S<=R.width-b&&(l>=0&&l<=R.height-x))T.readPixels(S,l,b,x,s.convert(v0),s.convert(g0),F0)}finally{let L0=p!==null?w.get(p).__webglFramebuffer:null;L.bindFramebuffer(T.FRAMEBUFFER,L0)}}},this.readRenderTargetPixelsAsync=async function(R,S,l,b,x,F0,R0,q0=0){if(!(R&&R.isWebGLRenderTarget))throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let k0=w.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&R0!==void 0)k0=k0[R0];if(k0)if(S>=0&&S<=R.width-b&&(l>=0&&l<=R.height-x)){L.bindFramebuffer(T.FRAMEBUFFER,k0);let L0=R.textures[q0],v0=L0.format,g0=L0.type;if(R.textures.length>1)T.readBuffer(T.COLOR_ATTACHMENT0+q0);let M0=b$(L0);if(M0.__formatReadable===!1)throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(M0.__typeReadable===!1)throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let o0=T.createBuffer();T.bindBuffer(T.PIXEL_PACK_BUFFER,o0),T.bufferData(T.PIXEL_PACK_BUFFER,F0.byteLength,T.STREAM_READ),T.readPixels(S,l,b,x,s.convert(v0),s.convert(g0),0),T.bindBuffer(T.PIXEL_PACK_BUFFER,null);let qJ=p!==null?w.get(p).__webglFramebuffer:null;L.bindFramebuffer(T.FRAMEBUFFER,qJ);let HJ=T.fenceSync(T.SYNC_GPU_COMMANDS_COMPLETE,0);return T.flush(),await XZ(T,HJ,4),T.bindBuffer(T.PIXEL_PACK_BUFFER,o0),T.getBufferSubData(T.PIXEL_PACK_BUFFER,0,F0),T.bindBuffer(T.PIXEL_PACK_BUFFER,null),T.deleteBuffer(o0),T.deleteSync(HJ),F0}else throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(R,S=null,l=0){let b=Math.pow(2,-l),x=Math.floor(R.image.width*b),F0=Math.floor(R.image.height*b),R0=S!==null?S.x:0,q0=S!==null?S.y:0;m.setTexture2D(R,0),T.copyTexSubImage2D(T.TEXTURE_2D,l,0,0,R0,q0,x,F0),L.unbindTexture()},this.copyTextureToTexture=function(R,S,l=null,b=null,x=0,F0=0){let R0,q0,k0,L0,v0,g0,M0,o0,qJ,HJ=R.isCompressedTexture?R.mipmaps[F0]:R.image;if(l!==null)R0=l.max.x-l.min.x,q0=l.max.y-l.min.y,k0=l.isBox3?l.max.z-l.min.z:1,L0=l.min.x,v0=l.min.y,g0=l.isBox3?l.min.z:0;else{let NJ=Math.pow(2,-x);if(R0=Math.floor(HJ.width*NJ),q0=Math.floor(HJ.height*NJ),R.isDataArrayTexture)k0=HJ.depth;else if(R.isData3DTexture)k0=Math.floor(HJ.depth*NJ);else k0=1;L0=0,v0=0,g0=0}if(b!==null)M0=b.x,o0=b.y,qJ=b.z;else M0=0,o0=0,qJ=0;let QJ=s.convert(S.format),AJ=s.convert(S.type),O0;if(S.isData3DTexture)m.setTexture3D(S,0),O0=T.TEXTURE_3D;else if(S.isDataArrayTexture||S.isCompressedArrayTexture)m.setTexture2DArray(S,0),O0=T.TEXTURE_2D_ARRAY;else m.setTexture2D(S,0),O0=T.TEXTURE_2D;L.activeTexture(T.TEXTURE0),L.pixelStorei(T.UNPACK_FLIP_Y_WEBGL,S.flipY),L.pixelStorei(T.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),L.pixelStorei(T.UNPACK_ALIGNMENT,S.unpackAlignment);let jJ=L.getParameter(T.UNPACK_ROW_LENGTH),u0=L.getParameter(T.UNPACK_IMAGE_HEIGHT),nJ=L.getParameter(T.UNPACK_SKIP_PIXELS),X9=L.getParameter(T.UNPACK_SKIP_ROWS),A9=L.getParameter(T.UNPACK_SKIP_IMAGES);L.pixelStorei(T.UNPACK_ROW_LENGTH,HJ.width),L.pixelStorei(T.UNPACK_IMAGE_HEIGHT,HJ.height),L.pixelStorei(T.UNPACK_SKIP_PIXELS,L0),L.pixelStorei(T.UNPACK_SKIP_ROWS,v0),L.pixelStorei(T.UNPACK_SKIP_IMAGES,g0);let X8=R.isDataArrayTexture||R.isData3DTexture,JJ=S.isDataArrayTexture||S.isData3DTexture;if(R.isDepthTexture){let NJ=w.get(R),P9=w.get(S),KJ=w.get(NJ.__renderTarget),C9=w.get(P9.__renderTarget);L.bindFramebuffer(T.READ_FRAMEBUFFER,KJ.__webglFramebuffer),L.bindFramebuffer(T.DRAW_FRAMEBUFFER,C9.__webglFramebuffer);for(let H8=0;H8<k0;H8++){if(X8)T.framebufferTextureLayer(T.READ_FRAMEBUFFER,T.COLOR_ATTACHMENT0,w.get(R).__webglTexture,x,g0+H8),T.framebufferTextureLayer(T.DRAW_FRAMEBUFFER,T.COLOR_ATTACHMENT0,w.get(S).__webglTexture,F0,qJ+H8);T.blitFramebuffer(L0,v0,R0,q0,M0,o0,R0,q0,T.DEPTH_BUFFER_BIT,T.NEAREST)}L.bindFramebuffer(T.READ_FRAMEBUFFER,null),L.bindFramebuffer(T.DRAW_FRAMEBUFFER,null)}else if(x!==0||R.isRenderTargetTexture||w.has(R)){let NJ=w.get(R),P9=w.get(S);L.bindFramebuffer(T.READ_FRAMEBUFFER,a),L.bindFramebuffer(T.DRAW_FRAMEBUFFER,_);for(let KJ=0;KJ<k0;KJ++){if(X8)T.framebufferTextureLayer(T.READ_FRAMEBUFFER,T.COLOR_ATTACHMENT0,NJ.__webglTexture,x,g0+KJ);else T.framebufferTexture2D(T.READ_FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_2D,NJ.__webglTexture,x);if(JJ)T.framebufferTextureLayer(T.DRAW_FRAMEBUFFER,T.COLOR_ATTACHMENT0,P9.__webglTexture,F0,qJ+KJ);else T.framebufferTexture2D(T.DRAW_FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_2D,P9.__webglTexture,F0);if(x!==0)T.blitFramebuffer(L0,v0,R0,q0,M0,o0,R0,q0,T.COLOR_BUFFER_BIT,T.NEAREST);else if(JJ)T.copyTexSubImage3D(O0,F0,M0,o0,qJ+KJ,L0,v0,R0,q0);else T.copyTexSubImage2D(O0,F0,M0,o0,L0,v0,R0,q0)}L.bindFramebuffer(T.READ_FRAMEBUFFER,null),L.bindFramebuffer(T.DRAW_FRAMEBUFFER,null)}else if(JJ)if(R.isDataTexture||R.isData3DTexture)T.texSubImage3D(O0,F0,M0,o0,qJ,R0,q0,k0,QJ,AJ,HJ.data);else if(S.isCompressedArrayTexture)T.compressedTexSubImage3D(O0,F0,M0,o0,qJ,R0,q0,k0,QJ,HJ.data);else T.texSubImage3D(O0,F0,M0,o0,qJ,R0,q0,k0,QJ,AJ,HJ);else if(R.isDataTexture)T.texSubImage2D(T.TEXTURE_2D,F0,M0,o0,R0,q0,QJ,AJ,HJ.data);else if(R.isCompressedTexture)T.compressedTexSubImage2D(T.TEXTURE_2D,F0,M0,o0,HJ.width,HJ.height,QJ,HJ.data);else T.texSubImage2D(T.TEXTURE_2D,F0,M0,o0,R0,q0,QJ,AJ,HJ);if(L.pixelStorei(T.UNPACK_ROW_LENGTH,jJ),L.pixelStorei(T.UNPACK_IMAGE_HEIGHT,u0),L.pixelStorei(T.UNPACK_SKIP_PIXELS,nJ),L.pixelStorei(T.UNPACK_SKIP_ROWS,X9),L.pixelStorei(T.UNPACK_SKIP_IMAGES,A9),F0===0&&S.generateMipmaps)T.generateMipmap(O0);L.unbindTexture()},this.initRenderTarget=function(R){if(w.get(R).__webglFramebuffer===void 0)m.setupRenderTarget(R)},this.initTexture=function(R){if(R.isCubeTexture)m.setTextureCube(R,0);else if(R.isData3DTexture)m.setTexture3D(R,0);else if(R.isDataArrayTexture||R.isCompressedArrayTexture)m.setTexture2DArray(R,0);else m.setTexture2D(R,0);L.unbindTexture()},this.resetState=function(){d=0,o=0,p=null,L.reset(),X0.reset()},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return jQ}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(J){this._outputColorSpace=J;let Q=this.getContext();Q.drawingBufferColorSpace=m0._getDrawingBufferColorSpace(J),Q.unpackColorSpace=m0._getUnpackColorSpace()}}var oZ={type:"change"},M$={type:"start"},rZ={type:"end"},Z6=new f8,aZ=new iJ,FN=Math.cos(70*vQ.DEG2RAD),MJ=new v,pJ=2*Math.PI,e0={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},k$=0.000001;class L$ extends e7{constructor(J,Q=null){super(J,Q);if(this.state=e0.NONE,this.target=new v,this.cursor=new v,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=0.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:f9.ROTATE,MIDDLE:f9.DOLLY,RIGHT:f9.PAN},this.touches={ONE:v9.ROTATE,TWO:v9.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new v,this._lastQuaternion=new aJ,this._lastTargetPosition=new v,this._quat=new aJ().setFromUnitVectors(J.up,new v(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new K7,this._sphericalDelta=new K7,this._scale=1,this._panOffset=new v,this._rotateStart=new j0,this._rotateEnd=new j0,this._rotateDelta=new j0,this._panStart=new j0,this._panEnd=new j0,this._panDelta=new j0,this._dollyStart=new j0,this._dollyEnd=new j0,this._dollyDelta=new j0,this._dollyDirection=new v,this._mouse=new j0,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=EN.bind(this),this._onPointerDown=DN.bind(this),this._onPointerUp=ON.bind(this),this._onContextMenu=IN.bind(this),this._onMouseWheel=MN.bind(this),this._onKeyDown=LN.bind(this),this._onTouchStart=VN.bind(this),this._onTouchMove=BN.bind(this),this._onMouseDown=RN.bind(this),this._onMouseMove=kN.bind(this),this._interceptControlDown=zN.bind(this),this._interceptControlUp=AN.bind(this),this.domElement!==null)this.connect(this.domElement);this.update()}set cursorStyle(J){if(this._cursorStyle=J,J==="grab")this.domElement.style.cursor="grab";else this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(J){super.connect(J),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=e0.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents();let J=this.domElement.getRootNode();J.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),J.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(J){J.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=J}stopListenToKeyEvents(){if(this._domElementKeyEvents!==null)this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(oZ),this.update(),this.state=e0.NONE}pan(J,Q){this._pan(J,Q),this.update()}dollyIn(J){this._dollyIn(J),this.update()}dollyOut(J){this._dollyOut(J),this.update()}rotateLeft(J){this._rotateLeft(J),this.update()}rotateUp(J){this._rotateUp(J),this.update()}update(J=null){let Q=this.object.position;if(MJ.copy(Q).sub(this.target),MJ.applyQuaternion(this._quat),this._spherical.setFromVector3(MJ),this.autoRotate&&this.state===e0.NONE)this._rotateLeft(this._getAutoRotationAngle(J));if(this.enableDamping)this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor;else this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi;let $=this.minAzimuthAngle,W=this.maxAzimuthAngle;if(isFinite($)&&isFinite(W)){if($<-Math.PI)$+=pJ;else if($>Math.PI)$-=pJ;if(W<-Math.PI)W+=pJ;else if(W>Math.PI)W-=pJ;if($<=W)this._spherical.theta=Math.max($,Math.min(W,this._spherical.theta));else this._spherical.theta=this._spherical.theta>($+W)/2?Math.max($,this._spherical.theta):Math.min(W,this._spherical.theta)}if(this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0)this.target.addScaledVector(this._panOffset,this.dampingFactor);else this.target.add(this._panOffset);this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let Z=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let K=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),Z=K!=this._spherical.radius}if(MJ.setFromSpherical(this._spherical),MJ.applyQuaternion(this._quatInverse),Q.copy(this.target).add(MJ),this.object.lookAt(this.target),this.enableDamping===!0)this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor);else this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0);if(this.zoomToCursor&&this._performCursorZoom){let K=null;if(this.object.isPerspectiveCamera){let Y=MJ.length();K=this._clampDistance(Y*this._scale);let X=Y-K;this.object.position.addScaledVector(this._dollyDirection,X),this.object.updateMatrixWorld(),Z=!!X}else if(this.object.isOrthographicCamera){let Y=new v(this._mouse.x,this._mouse.y,0);Y.unproject(this.object);let X=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),Z=X!==this.object.zoom;let H=new v(this._mouse.x,this._mouse.y,0);H.unproject(this.object),this.object.position.sub(H).add(Y),this.object.updateMatrixWorld(),K=MJ.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;if(K!==null)if(this.screenSpacePanning)this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(K).add(this.object.position);else if(Z6.origin.copy(this.object.position),Z6.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Z6.direction))<FN)this.object.lookAt(this.target);else aZ.setFromNormalAndCoplanarPoint(this.object.up,this.target),Z6.intersectPlane(aZ,this.target)}else if(this.object.isOrthographicCamera){let K=this.object.zoom;if(this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),K!==this.object.zoom)this.object.updateProjectionMatrix(),Z=!0}if(this._scale=1,this._performCursorZoom=!1,Z||this._lastPosition.distanceToSquared(this.object.position)>k$||8*(1-this._lastQuaternion.dot(this.object.quaternion))>k$||this._lastTargetPosition.distanceToSquared(this.target)>k$)return this.dispatchEvent(oZ),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0;return!1}_getAutoRotationAngle(J){if(J!==null)return pJ/60*this.autoRotateSpeed*J;else return pJ/60/60*this.autoRotateSpeed}_getZoomScale(J){let Q=Math.abs(J*0.01);return Math.pow(0.95,this.zoomSpeed*Q)}_rotateLeft(J){this._sphericalDelta.theta-=J}_rotateUp(J){this._sphericalDelta.phi-=J}_panLeft(J,Q){MJ.setFromMatrixColumn(Q,0),MJ.multiplyScalar(-J),this._panOffset.add(MJ)}_panUp(J,Q){if(this.screenSpacePanning===!0)MJ.setFromMatrixColumn(Q,1);else MJ.setFromMatrixColumn(Q,0),MJ.crossVectors(this.object.up,MJ);MJ.multiplyScalar(J),this._panOffset.add(MJ)}_pan(J,Q){let $=this.domElement;if(this.object.isPerspectiveCamera){let W=this.object.position;MJ.copy(W).sub(this.target);let Z=MJ.length();Z*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*J*Z/$.clientHeight,this.object.matrix),this._panUp(2*Q*Z/$.clientHeight,this.object.matrix)}else if(this.object.isOrthographicCamera)this._panLeft(J*(this.object.right-this.object.left)/this.object.zoom/$.clientWidth,this.object.matrix),this._panUp(Q*(this.object.top-this.object.bottom)/this.object.zoom/$.clientHeight,this.object.matrix);else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1}_dollyOut(J){if(this.object.isPerspectiveCamera||this.object.isOrthographicCamera)this._scale/=J;else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1}_dollyIn(J){if(this.object.isPerspectiveCamera||this.object.isOrthographicCamera)this._scale*=J;else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1}_updateZoomParameters(J,Q){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let $=this.domElement.getBoundingClientRect(),W=J-$.left,Z=Q-$.top,K=$.width,Y=$.height;this._mouse.x=W/K*2-1,this._mouse.y=-(Z/Y)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(J){return Math.max(this.minDistance,Math.min(this.maxDistance,J))}_handleMouseDownRotate(J){this._rotateStart.set(J.clientX,J.clientY)}_handleMouseDownDolly(J){this._updateZoomParameters(J.clientX,J.clientX),this._dollyStart.set(J.clientX,J.clientY)}_handleMouseDownPan(J){this._panStart.set(J.clientX,J.clientY)}_handleMouseMoveRotate(J){this._rotateEnd.set(J.clientX,J.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let Q=this.domElement;this._rotateLeft(pJ*this._rotateDelta.x/Q.clientHeight),this._rotateUp(pJ*this._rotateDelta.y/Q.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(J){if(this._dollyEnd.set(J.clientX,J.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0)this._dollyOut(this._getZoomScale(this._dollyDelta.y));else if(this._dollyDelta.y<0)this._dollyIn(this._getZoomScale(this._dollyDelta.y));this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(J){this._panEnd.set(J.clientX,J.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(J){if(this._updateZoomParameters(J.clientX,J.clientY),J.deltaY<0)this._dollyIn(this._getZoomScale(J.deltaY));else if(J.deltaY>0)this._dollyOut(this._getZoomScale(J.deltaY));this.update()}_handleKeyDown(J){let Q=!1;switch(J.code){case this.keys.UP:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateUp(pJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(0,this.keyPanSpeed);Q=!0;break;case this.keys.BOTTOM:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateUp(-pJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(0,-this.keyPanSpeed);Q=!0;break;case this.keys.LEFT:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateLeft(pJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(this.keyPanSpeed,0);Q=!0;break;case this.keys.RIGHT:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateLeft(-pJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(-this.keyPanSpeed,0);Q=!0;break}if(Q)J.preventDefault(),this.update()}_handleTouchStartRotate(J){if(this._pointers.length===1)this._rotateStart.set(J.pageX,J.pageY);else{let Q=this._getSecondPointerPosition(J),$=0.5*(J.pageX+Q.x),W=0.5*(J.pageY+Q.y);this._rotateStart.set($,W)}}_handleTouchStartPan(J){if(this._pointers.length===1)this._panStart.set(J.pageX,J.pageY);else{let Q=this._getSecondPointerPosition(J),$=0.5*(J.pageX+Q.x),W=0.5*(J.pageY+Q.y);this._panStart.set($,W)}}_handleTouchStartDolly(J){let Q=this._getSecondPointerPosition(J),$=J.pageX-Q.x,W=J.pageY-Q.y,Z=Math.sqrt($*$+W*W);this._dollyStart.set(0,Z)}_handleTouchStartDollyPan(J){if(this.enableZoom)this._handleTouchStartDolly(J);if(this.enablePan)this._handleTouchStartPan(J)}_handleTouchStartDollyRotate(J){if(this.enableZoom)this._handleTouchStartDolly(J);if(this.enableRotate)this._handleTouchStartRotate(J)}_handleTouchMoveRotate(J){if(this._pointers.length==1)this._rotateEnd.set(J.pageX,J.pageY);else{let $=this._getSecondPointerPosition(J),W=0.5*(J.pageX+$.x),Z=0.5*(J.pageY+$.y);this._rotateEnd.set(W,Z)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let Q=this.domElement;this._rotateLeft(pJ*this._rotateDelta.x/Q.clientHeight),this._rotateUp(pJ*this._rotateDelta.y/Q.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(J){if(this._pointers.length===1)this._panEnd.set(J.pageX,J.pageY);else{let Q=this._getSecondPointerPosition(J),$=0.5*(J.pageX+Q.x),W=0.5*(J.pageY+Q.y);this._panEnd.set($,W)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(J){let Q=this._getSecondPointerPosition(J),$=J.pageX-Q.x,W=J.pageY-Q.y,Z=Math.sqrt($*$+W*W);this._dollyEnd.set(0,Z),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let K=(J.pageX+Q.x)*0.5,Y=(J.pageY+Q.y)*0.5;this._updateZoomParameters(K,Y)}_handleTouchMoveDollyPan(J){if(this.enableZoom)this._handleTouchMoveDolly(J);if(this.enablePan)this._handleTouchMovePan(J)}_handleTouchMoveDollyRotate(J){if(this.enableZoom)this._handleTouchMoveDolly(J);if(this.enableRotate)this._handleTouchMoveRotate(J)}_addPointer(J){this._pointers.push(J.pointerId)}_removePointer(J){delete this._pointerPositions[J.pointerId];for(let Q=0;Q<this._pointers.length;Q++)if(this._pointers[Q]==J.pointerId){this._pointers.splice(Q,1);return}}_isTrackingPointer(J){for(let Q=0;Q<this._pointers.length;Q++)if(this._pointers[Q]==J.pointerId)return!0;return!1}_trackPointer(J){let Q=this._pointerPositions[J.pointerId];if(Q===void 0)Q=new j0,this._pointerPositions[J.pointerId]=Q;Q.set(J.pageX,J.pageY)}_getSecondPointerPosition(J){let Q=J.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[Q]}_customWheelEvent(J){let Q=J.deltaMode,$={clientX:J.clientX,clientY:J.clientY,deltaY:J.deltaY};switch(Q){case 1:$.deltaY*=16;break;case 2:$.deltaY*=100;break}if(J.ctrlKey&&!this._controlActive)$.deltaY*=10;return $}}function DN(J){if(this.enabled===!1)return;if(this._pointers.length===0)this.domElement.setPointerCapture(J.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp);if(this._isTrackingPointer(J))return;if(this._addPointer(J),J.pointerType==="touch")this._onTouchStart(J);else this._onMouseDown(J);if(this._cursorStyle==="grab")this.domElement.style.cursor="grabbing"}function EN(J){if(this.enabled===!1)return;if(J.pointerType==="touch")this._onTouchMove(J);else this._onMouseMove(J)}function ON(J){switch(this._removePointer(J),this._pointers.length){case 0:if(this.domElement.releasePointerCapture(J.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(rZ),this.state=e0.NONE,this._cursorStyle==="grab")this.domElement.style.cursor="grab";break;case 1:let Q=this._pointers[0],$=this._pointerPositions[Q];this._onTouchStart({pointerId:Q,pageX:$.x,pageY:$.y});break}}function RN(J){let Q;switch(J.button){case 0:Q=this.mouseButtons.LEFT;break;case 1:Q=this.mouseButtons.MIDDLE;break;case 2:Q=this.mouseButtons.RIGHT;break;default:Q=-1}switch(Q){case f9.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(J),this.state=e0.DOLLY;break;case f9.ROTATE:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(J),this.state=e0.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(J),this.state=e0.ROTATE}break;case f9.PAN:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(J),this.state=e0.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(J),this.state=e0.PAN}break;default:this.state=e0.NONE}if(this.state!==e0.NONE)this.dispatchEvent(M$)}function kN(J){switch(this.state){case e0.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(J);break;case e0.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(J);break;case e0.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(J);break}}function MN(J){if(this.enabled===!1||this.enableZoom===!1||this.state!==e0.NONE)return;J.preventDefault(),this.dispatchEvent(M$),this._handleMouseWheel(this._customWheelEvent(J)),this.dispatchEvent(rZ)}function LN(J){if(this.enabled===!1)return;this._handleKeyDown(J)}function VN(J){switch(this._trackPointer(J),this._pointers.length){case 1:switch(this.touches.ONE){case v9.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(J),this.state=e0.TOUCH_ROTATE;break;case v9.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(J),this.state=e0.TOUCH_PAN;break;default:this.state=e0.NONE}break;case 2:switch(this.touches.TWO){case v9.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(J),this.state=e0.TOUCH_DOLLY_PAN;break;case v9.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(J),this.state=e0.TOUCH_DOLLY_ROTATE;break;default:this.state=e0.NONE}break;default:this.state=e0.NONE}if(this.state!==e0.NONE)this.dispatchEvent(M$)}function BN(J){switch(this._trackPointer(J),this.state){case e0.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(J),this.update();break;case e0.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(J),this.update();break;case e0.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(J),this.update();break;case e0.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(J),this.update();break;default:this.state=e0.NONE}}function IN(J){if(this.enabled===!1)return;J.preventDefault()}function zN(J){if(J.key==="Control")this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0})}function AN(J){if(J.key==="Control")this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0})}class K6 extends _J{constructor(J=document.createElement("div")){super();this.isCSS2DObject=!0,this.element=J,this.element.style.position="absolute",this.element.style.userSelect="none",this.element.setAttribute("draggable",!1),this.center=new j0(0.5,0.5),this.rotation2D=0,this.addEventListener("removed",function(){this.traverse(function(Q){if(Q.element&&Q.element instanceof Q.element.ownerDocument.defaultView.Element&&Q.element.parentNode!==null)Q.element.remove()})})}copy(J,Q){return super.copy(J,Q),this.element=J.element.cloneNode(!0),this.center=J.center,this.rotation2D=J.rotation2D,this}}var p8=new v,tZ=new YJ,eZ=new YJ,JK=new v,QK=new v;class V${constructor(J={}){let Q=this,$,W,Z,K,Y={objects:new WeakMap},X=J.element!==void 0?J.element:document.createElement("div");X.style.overflow="hidden",this.domElement=X,this.sortObjects=!0,this.getSize=function(){return{width:$,height:W}},this.render=function(D,M){if(D.matrixWorldAutoUpdate===!0)D.updateMatrixWorld();if(M.parent===null&&M.matrixWorldAutoUpdate===!0)M.updateMatrixWorld();if(tZ.copy(M.matrixWorldInverse),eZ.multiplyMatrices(M.projectionMatrix,tZ),U(D,D,M),this.sortObjects)G(D)},this.setSize=function(D,M){$=D,W=M,Z=$/2,K=W/2,X.style.width=D+"px",X.style.height=M+"px"};function H(D){if(D.isCSS2DObject)D.element.style.display="none";for(let M=0,I=D.children.length;M<I;M++)H(D.children[M])}function U(D,M,I){if(D.visible===!1){H(D);return}if(D.isCSS2DObject){p8.setFromMatrixPosition(D.matrixWorld),p8.applyMatrix4(eZ);let F=p8.z>=-1&&p8.z<=1&&D.layers.test(I.layers)===!0,q=D.element;if(q.style.display=F===!0?"":"none",F===!0){D.onBeforeRender(Q,M,I);let j=100*D.center.x,V=100*D.center.y;q.style.transformOrigin=`${j}% ${V}%`;let z=-D.rotation2D,P=p8.x*Z+Z,C=-p8.y*K+K;if(q.style.transform=`translate(${-j}%, ${-V}%) translate(${P}px, ${C}px) rotate(${z}rad)`,q.parentNode!==X)X.appendChild(q);D.onAfterRender(Q,M,I)}let A={distanceToCameraSquared:N(I,D)};Y.objects.set(D,A)}for(let F=0,q=D.children.length;F<q;F++)U(D.children[F],M,I)}function N(D,M){return JK.setFromMatrixPosition(D.matrixWorld),QK.setFromMatrixPosition(M.matrixWorld),JK.distanceToSquared(QK)}function E(D){let M=[];return D.traverseVisible(function(I){if(I.isCSS2DObject)M.push(I)}),M}function G(D){let M=E(D).sort(function(F,q){if(F.renderOrder!==q.renderOrder)return q.renderOrder-F.renderOrder;let A=Y.objects.get(F).distanceToCameraSquared,j=Y.objects.get(q).distanceToCameraSquared;return A-j}),I=M.length;for(let F=0,q=M.length;F<q;F++)M[F].element.style.zIndex=I-F}}}var tJ=window.ATLAS_SCENE;if(!tJ)throw Error("atlas scene data missing");var LJ={dark:{paper:867181,paperDeep:534861,ink:15660799,grid:10470638,gridMajor:14216447,accent:8384767,warm:16757086,muted:10469608},light:{paper:15988732,paperDeep:15199992,ink:801387,grid:10139352,gridMajor:7115455,accent:689407,warm:12741120,muted:5995430}},Y6=["frontend","backend","database","cloud","security","messagebus","external"],XK={dark:{frontend:9417983,backend:9427140,database:12167423,cloud:16765071,security:16751280,messagebus:16759183,external:13228266},light:{frontend:3104720,backend:2067053,database:6967248,cloud:11561472,security:12597850,messagebus:12738560,external:5995430}},p9={theme:"dark",selected:null,view:"all",running:!1},m9=document.querySelector(".stage")||document.getElementById("stage");if(!m9)throw Error("prism viewer: no stage element");var PN=document.getElementById("gl"),HK=document.getElementById("labels"),fJ=new R$({canvas:PN,antialias:!0,alpha:!0,preserveDrawingBuffer:!0});fJ.setPixelRatio(Math.min(2,window.devicePixelRatio||1));var UK=new V$({element:HK}),K9=new u7,n0=new h8(-10,10,10,-10,-1000,4000),SJ=new L$(n0,fJ.domElement);SJ.enableDamping=!0;SJ.dampingFactor=0.08;SJ.rotateSpeed=0.6;SJ.zoomSpeed=0.9;SJ.panSpeed=0.7;SJ.minZoom=0.25;SJ.maxZoom=8;SJ.screenSpacePanning=!1;var m8=new zJ({transparent:!0,depthWrite:!1,uniforms:{uPaper:{value:new C0(LJ.dark.paper)},uDeep:{value:new C0(LJ.dark.paperDeep)},uGrid:{value:new C0(LJ.dark.grid)},uMajor:{value:new C0(LJ.dark.gridMajor)},uFade:{value:900}},vertexShader:["varying vec2 vXZ;","varying float vDepth;","void main() {","  vXZ = position.xz;","  vec4 mv = modelViewMatrix * vec4(position, 1.0);","  vDepth = -mv.z;","  gl_Position = projectionMatrix * mv;","}"].join(`
`),fragmentShader:["uniform vec3 uPaper; uniform vec3 uDeep; uniform vec3 uGrid; uniform vec3 uMajor; uniform float uFade;","varying vec2 vXZ; varying float vDepth;","float lineMask(float coord, float width) {","  float d = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);","  return 1.0 - smoothstep(0.0, width, d);","}","void main() {","  float minor = max(lineMask(vXZ.x, 1.0), lineMask(vXZ.y, 1.0));","  float major = max(lineMask(vXZ.x / 5.0, 1.2), lineMask(vXZ.y / 5.0, 1.2));","  vec3 color = mix(uPaper, uDeep, clamp(vDepth / uFade, 0.0, 1.0));","  color = mix(color, uGrid, minor * 0.35);","  color = mix(color, uMajor, major * 0.55);","  float fade = 1.0 - smoothstep(uFade * 0.35, uFade, vDepth);","  gl_FragColor = vec4(color, 0.25 + 0.75 * fade);","}"].join(`
`)}),$K=4200,A$=new BJ(new Q8($K,$K,1,1),m8);A$.rotation.x=-Math.PI/2;A$.position.y=-0.02;K9.add(A$);var g9=new zJ({transparent:!0,uniforms:{uPaper:{value:new C0(LJ.dark.paper)},uInk:{value:new C0(LJ.dark.ink)},uMuted:{value:new C0(LJ.dark.muted)},uAccent:{value:new C0(LJ.dark.accent)},uTint:{value:Y6.map((J)=>new C0(LJ.dark[J]?LJ.dark[J]:LJ.dark.muted))},uTints:{value:Y6.map((J)=>new C0(XK.dark[J]||16777215))},uStripe:{value:3.4},uFade:{value:900},uSelected:{value:-1}},vertexShader:["attribute vec2 aUv; attribute float aFace; attribute float aType; attribute float aFlags; attribute float aIndex;","varying vec2 vUv; varying float vFace; varying float vType; varying float vFlags; varying float vIndex; varying float vDepth;","void main() {","  vUv = aUv; vFace = aFace; vType = aType; vFlags = aFlags; vIndex = aIndex;","  vec4 mv = modelViewMatrix * vec4(position, 1.0);","  vDepth = -mv.z;","  gl_Position = projectionMatrix * mv;","}"].join(`
`),fragmentShader:["uniform vec3 uPaper; uniform vec3 uInk; uniform vec3 uMuted; uniform vec3 uAccent;","uniform vec3 uTint[7]; uniform vec3 uTints[7]; uniform float uStripe; uniform float uFade; uniform float uSelected;","varying vec2 vUv; varying float vFace; varying float vType; varying float vFlags; varying float vIndex; varying float vDepth;","float edge(vec2 uv, vec2 scale) {","  vec2 d = min(uv, 1.0 - uv) * scale;","  vec2 w = fwidth(uv) * scale;","  vec2 m = smoothstep(vec2(0.0), 1.4 * w, d);","  return 1.0 - min(m.x, m.y);","}","float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }","void main() {","  int typeIndex = int(clamp(vType, 0.0, 6.0));","  vec3 tint = uTints[typeIndex];","  vec3 ink = mix(uInk, tint, 0.45);","  bool removed = mod(vFlags, 2.0) >= 1.0;","  float dashCut = removed ? step(0.55, fract(vUv.x * 0.45)) : 1.0;","  vec3 color = uPaper;","  float alpha = 1.0;","  if (vFace > 0.5) {","    float stripe = abs(fract((vUv.x * uStripe + vUv.y * uStripe) * 0.5) - 0.5) * 2.0;","    float hatching = 1.0 - smoothstep(0.0, 1.6 * fwidth(stripe), stripe);","    color = mix(uPaper, ink, 0.18 + 0.55 * hatching * (removed ? 0.5 : 1.0) * dashCut);","    color = mix(color, ink, 0.22 * smoothstep(1.0, 0.0, vUv.y));","    float border = edge(vUv, vec2(1.0, 1.0));","    color = mix(color, ink, border * (removed ? 0.75 : 1.0) * dashCut);","  } else {","    float tintFill = 0.3;","    color = mix(uPaper, tint, tintFill);","    float micro = 1.0 - smoothstep(0.0, 1.4 * fwidth(vUv.y * 40.0), abs(fract(vUv.y * 40.0) - 0.5) * 2.0);","    color = mix(color, ink, micro * 0.06);","    color = mix(color, ink, edge(vUv, vec2(1.0, 1.0)) * 0.9);","  }","  float selected = step(abs(vIndex - uSelected), 0.5);","  color = mix(color, uAccent, selected * 0.28);","  color = mix(color, uPaper, clamp(vDepth / uFade, 0.0, 0.35));","  color += (hash(vUv * 380.0) - 0.5) * 0.012;","  gl_FragColor = vec4(color, alpha);","}"].join(`
`)}),z9=new zJ({transparent:!0,depthWrite:!1,side:uJ,uniforms:{uInk:{value:new C0(LJ.dark.ink)},uMuted:{value:new C0(LJ.dark.muted)},uAccent:{value:new C0(LJ.dark.accent)},uWarm:{value:new C0(LJ.dark.warm)},uPaper:{value:new C0(LJ.dark.paper)},uFade:{value:900},uWidth:{value:1}},vertexShader:["attribute float aDist; attribute float aSide; attribute float aVariant; attribute float aEnd;","varying float vDist; varying float vSide; varying float vVariant; varying float vEnd; varying float vDepth;","void main() {","  vDist = aDist; vSide = aSide; vVariant = aVariant; vEnd = aEnd;","  vec4 mv = modelViewMatrix * vec4(position, 1.0);","  vDepth = -mv.z;","  gl_Position = projectionMatrix * mv;","}"].join(`
`),fragmentShader:["uniform vec3 uInk; uniform vec3 uMuted; uniform vec3 uAccent; uniform vec3 uWarm; uniform vec3 uPaper; uniform float uFade; uniform float uWidth;","varying float vDist; varying float vSide; varying float vVariant; varying float vEnd; varying float vDepth;","void main() {","  vec3 color = uInk;","  if (vVariant > 1.5) color = uAccent;","  else if (vVariant > 0.5) color = uMuted;","  float across = abs(vSide);","  float core = 1.0 - smoothstep(0.35, 1.0, across);","  float solid = 1.0;","  if (vEnd > 0.5 && vVariant > 0.5) solid = step(0.45, fract(vDist * 0.09));","  float alpha = core * solid;","  vec3 outColor = mix(uPaper, color, 1.0);","  outColor = mix(outColor, uPaper, clamp(vDepth / uFade, 0.0, 0.8));","  if (alpha < 0.02) discard;","  gl_FragColor = vec4(outColor, alpha);","}"].join(`
`)}),I$=new zJ({transparent:!0,depthWrite:!1,side:uJ,uniforms:{uInk:{value:new C0(LJ.dark.muted)},uPaper:{value:new C0(LJ.dark.paper)},uFade:{value:900}},vertexShader:z9.vertexShader,fragmentShader:["uniform vec3 uInk; uniform vec3 uPaper; uniform float uFade;","varying float vDist; varying float vSide; varying float vVariant; varying float vEnd; varying float vDepth;","void main() {","  float across = abs(vSide);","  float core = 1.0 - smoothstep(0.25, 1.0, across);","  float dash = step(0.35, fract(vDist * 0.05));","  float alpha = core * dash * 0.85;","  if (alpha < 0.02) discard;","  vec3 color = mix(uPaper, uInk, 0.85);","  gl_FragColor = vec4(color, alpha);","}"].join(`
`)});function GK(J,{width:Q,variant:$,closed:W,lift:Z}){let K=[],Y=[],X=[],H=[],U=[],N=[],E=W?[...J,J[0]]:J,G=0;for(let M=0;M<E.length-1;M+=1){let I=E[M],F=E[M+1],q=F.x-I.x,A=F.z-I.z,j=Math.hypot(q,A)||1,V=-A/j,z=q/j,P=[[I.x+V*Q/2,I.z+z*Q/2,I.x-V*Q/2,I.z-z*Q/2],[F.x+V*Q/2,F.z+z*Q/2,F.x-V*Q/2,F.z-z*Q/2]],C=E.map((h)=>h.y===void 0?Z:h.y),k=C[M],B=C[M+1],g=[[P[0][0],k,P[0][1],0,-1],[P[0][2],k,P[0][3],G,1],[P[1][0],B,P[1][1],0,-1],[P[1][2],B,P[1][3],G+j,1]],f=[0,1,2,2,1,3];for(let h of f){let[a,_,d,o,p]=g[h];K.push(a,_,d),Y.push(o,p),X.push(o),H.push(p),U.push($),N.push(M===0||M===E.length-2?1:0)}G+=j}let D=new gJ;return D.setAttribute("position",new t0(K,3)),D.setAttribute("uv",new t0(Y,2)),D.setAttribute("aDist",new t0(X,1)),D.setAttribute("aSide",new t0(H,1)),D.setAttribute("aVariant",new t0(U,1)),D.setAttribute("aEnd",new t0(N,1)),D}function CN(J){let Q=[],$=[],W=[],Z=[],K=[],Y=[],X=[],H=new F9,U=(G)=>Math.max(0,Y6.indexOf(G));J.forEach((G,D)=>{let{x:M,z:I}=G,F=G.x+G.w,q=G.z+G.d,A=Math.max(0.15,G.h),j=U(G.type),V=G.state==="removed"?1:0;H.expandByPoint(new v(M,A,I)),H.expandByPoint(new v(F,0,q));let z=(B,g,f,h,a,_)=>{Q.push(B,g,f),$.push(h,a),W.push(_),Z.push(j),K.push(V),Y.push(D)};z(M,A,I,0,0,0),z(M,A,q,0,1,0),z(F,A,q,1,1,0),z(M,A,I,0,0,0),z(F,A,q,1,1,0),z(F,A,I,1,0,0);let P=[[[M,I],[F,I]],[[F,I],[F,q]],[[F,q],[M,q]],[[M,q],[M,I]]],C=0;for(let[B,g]of P){let f=Math.hypot(g[0]-B[0],g[1]-B[1]);z(B[0],0,B[1],C,0,1),z(g[0],0,g[1],C+f,0,1),z(g[0],A,g[1],C+f,A,1),z(B[0],0,B[1],C,0,1),z(g[0],A,g[1],C+f,A,1),z(B[0],A,B[1],C,A,1),C+=f}let k=new BJ(new x9(G.w,A,G.d),new v8({visible:!1}));k.position.set(M+G.w/2,A/2,I+G.d/2),k.userData.nodeId=G.id,X.push(k),K9.add(k)});let N=new gJ;N.setAttribute("position",new t0(Q,3)),N.setAttribute("aUv",new t0($,2)),N.setAttribute("aFace",new t0(W,1)),N.setAttribute("aType",new t0(Z,1)),N.setAttribute("aFlags",new t0(K,1)),N.setAttribute("aIndex",new t0(Y,1));let E=new BJ(N,g9);return K9.add(E),{bounds:H,pickMeshes:X}}var NK=[];function wN(J){let Q=document.createElement("div");Q.className="plabel"+(J.state==="removed"?" gone":""),Q.innerHTML="<b>"+J.code+"</b><span>"+J.name+"</span>",Q.addEventListener("pointerdown",(W)=>{W.stopPropagation(),G6(J.id)});let $=new K6(Q);$.position.set(J.x+J.w/2,Math.max(0.15,J.h)+0.22,J.z+J.d/2),K9.add($),NK.push({id:J.id,element:Q,object:$})}function qK(J,Q,$){let W=document.createElement("div");W.className=$,W.innerHTML=Q;let Z=new K6(W);return Z.position.copy(J),K9.add(Z),Z}var P$=CN(tJ.nodes),U6=P$.bounds;tJ.nodes.forEach(wN);for(let J of tJ.zones){let Q=[new v(J.x0,0.02,J.z0),new v(J.x1,0.02,J.z0),new v(J.x1,0.02,J.z1),new v(J.x0,0.02,J.z1)];K9.add(new BJ(GK(Q,{width:0.22,variant:2,closed:!0,lift:0.02}),I$)),qK(new v(J.x0,0.3,J.z0),J.label,"zlabel")}for(let J of tJ.routes){if(J.points.length<2)continue;let Q=J.points.map((G)=>new v(G.x,0.05,G.z));K9.add(new BJ(GK(Q,{width:0.28,variant:J.variant,lift:0.06}),z9));let $=Q[Q.length-1],W=Q[Q.length-2],Z=new v().subVectors($,W).normalize(),K=new v(-Z.z,0,Z.x),Y=new gJ,X=0.85,H=0.55,U=$.clone().addScaledVector(Z,-X),N=[$.x,$.y,$.z,U.x+K.x*H,U.y,U.z+K.z*H,U.x-K.x*H,U.y,U.z-K.z*H];Y.setAttribute("position",new t0(N,3)),Y.setAttribute("aDist",new t0([0,0,0],1)),Y.setAttribute("aSide",new t0([0,0.6,0.6],1)),Y.setAttribute("aVariant",new t0([J.variant,J.variant,J.variant],1)),Y.setAttribute("aEnd",new t0([0,0,0],1));let E=new BJ(Y,z9);if(!J.hideArrow)K9.add(E);if(J.label){let G=Q[Math.floor(Q.length/2)];qK(G.clone().setY(0.35),J.label,"elabel")}}var z$=U6.getCenter(new v),WK=U6.getSize(new v),_N=Math.max(WK.x,WK.z*2.2,24),TN=new v(1,0.86,1).normalize();function SN(J){n0.updateMatrixWorld(),n0.updateProjectionMatrix();let Q=0.0001,$=0.0001;for(let W of[J.min.x,J.max.x])for(let Z of[J.min.y,J.max.y])for(let K of[J.min.z,J.max.z]){let Y=new v(W,Z,K).project(n0);Q=Math.max(Q,Math.abs(Y.x)),$=Math.max($,Math.abs(Y.y))}return Math.max(Q,$)}function FK(J,Q){let $=Math.max(0.35,m9.clientWidth/Math.max(1,m9.clientHeight)),W=Math.max(2,Math.max(J.max.x-J.min.x,J.max.z-J.min.z)*0.6);for(let Z=0;Z<3;Z+=1){n0.top=W,n0.bottom=-W,n0.right=W*$,n0.left=-W*$;let K=SN(J);W=W*K*Q}return W}function DK(J){n0.position.copy(J).addScaledVector(TN,600),n0.up.set(0,1,0),n0.lookAt(J),n0.updateMatrixWorld()}var EK=24;function jN(J=1.02){n0.near=1,n0.far=8000,DK(z$);let Q=FK(U6,J);EK=Q,n0.top=Q,n0.bottom=-Q,n0.right=Q*(m9.clientWidth/Math.max(1,m9.clientHeight)),n0.left=-n0.right,n0.updateProjectionMatrix(),SJ.target.copy(z$),SJ.update()}function C$(){let J=m9.getBoundingClientRect(),Q=Math.max(1,Math.round(J.width)),$=Math.max(1,Math.round(J.height));fJ.setPixelRatio(Math.min(2,window.devicePixelRatio||1)),fJ.setSize(Q,$,!1),fJ.domElement.style.width=Q+"px",fJ.domElement.style.height=$+"px",UK.setSize(Q,$),jN()}window.addEventListener("resize",C$);C$();requestAnimationFrame(C$);var B$=document.getElementById("side")||document.createElement("nav"),ZK=document.getElementById("chapters"),OK=document.getElementById("pb");function RK(J){return tJ.nodes.find((Q)=>Q.id===J)}function yN(){let J=new Map;for(let Q of tJ.nodes){let $=Q.group||"other";if(!J.has($))J.set($,[]);J.get($).push(Q)}B$.innerHTML="";for(let[Q,$]of J){let W=document.createElement("div");W.className="gh",W.innerHTML="<span>"+Q.toUpperCase()+"</span><span>"+$.length+"</span>",B$.appendChild(W);for(let Z of $){let K=document.createElement("button");K.className="row"+(Z.state==="removed"?" ghost":""),K.innerHTML='<span class="cd">'+Z.code+'</span><span class="nm">'+Z.name+"</span>",K.addEventListener("click",()=>G6(Z.id)),B$.appendChild(K)}}}function fN(){ZK.innerHTML='<span class="lbl">Views</span>';for(let J of tJ.views){let Q=document.createElement("button");Q.className="ch",Q.textContent=J.label,Q.setAttribute("aria-pressed",String(J.id===p9.view)),Q.addEventListener("click",()=>w$(J.id)),ZK.appendChild(Q)}}function kK(){OK.innerHTML=tJ.introHtml}function G6(J){p9.selected=J,g9.uniforms.uSelected.value=J?tJ.nodes.findIndex((W)=>W.id===J):-1,NK.forEach((W)=>W.element.classList.toggle("on",W.id===J)),document.querySelectorAll(".side .row").forEach((W)=>W.classList.remove("on"));let Q=RK(J);if(!Q){kK();return}let $=Q.facts.map((W)=>"<dt>"+W[0]+"</dt><dd>"+W[1]+"</dd>").join("");OK.innerHTML='<div class="k">'+(Q.group||"component")+'</div><h2 class="pt">'+Q.name+'</h2><p class="ps">'+Q.code+" · "+Q.type+(Q.state==="removed"?" · removed":"")+'</p><div class="k">What it does</div><p>'+Q.does+'</p><div class="k">How it is built</div><p>'+Q.built+"</p>"+($?'<div class="k">Facts</div><dl class="facts">'+$+"</dl>":"")}function KK(J,Q){let $={x:SJ.target.x,z:SJ.target.z,half:n0.top},W=performance.now(),Z=420;p9.running=!0;let K=()=>{let Y=Math.min(1,(performance.now()-W)/420),X=Y<0.5?2*Y*Y:1-Math.pow(-2*Y+2,2)/2,H=$.x+(J.x-$.x)*X,U=$.z+(J.z-$.z)*X,N=$.half+(Q-$.half)*X,E=Math.max(0.35,m9.clientWidth/Math.max(1,m9.clientHeight));if(n0.top=N,n0.bottom=-N,n0.right=N*E,n0.left=-N*E,n0.updateProjectionMatrix(),SJ.target.set(H,0,U),SJ.update(),Y<1)requestAnimationFrame(K);else p9.running=!1};requestAnimationFrame(K)}function w$(J){p9.view=J,document.querySelectorAll(".chapters .ch").forEach((K)=>K.setAttribute("aria-pressed",String(K.textContent===(tJ.views.find((Y)=>Y.id===J)||{}).label)));let Q=tJ.views.find((K)=>K.id===J);if(!Q||!Q.nodes||Q.nodes.length===0){KK(z$,_N/2*1.18);return}let $=new F9;for(let K of Q.nodes){let Y=RK(K);if(!Y)continue;$.expandByPoint(new v(Y.x,0,Y.z)),$.expandByPoint(new v(Y.x+Y.w,Y.h,Y.z+Y.d))}if($.isEmpty())return;let W=$.getCenter(new v),Z=$.getSize(new v);DK(W),KK(W,FK($,1.06))}yN();fN();kK();var X6=new t7,l8=new j0;fJ.domElement.addEventListener("pointermove",(J)=>{let Q=fJ.domElement.getBoundingClientRect();l8.x=(J.clientX-Q.left)/Q.width*2-1,l8.y=-((J.clientY-Q.top)/Q.height)*2+1,X6.setFromCamera(l8,n0);let $=X6.intersectObjects(P$.pickMeshes,!1)[0];fJ.domElement.style.cursor=$?"pointer":"grab"});fJ.domElement.addEventListener("click",(J)=>{let Q=fJ.domElement.getBoundingClientRect();l8.x=(J.clientX-Q.left)/Q.width*2-1,l8.y=-((J.clientY-Q.top)/Q.height)*2+1,X6.setFromCamera(l8,n0);let $=X6.intersectObjects(P$.pickMeshes,!1)[0];G6($?$.object.userData.nodeId:null)});window.addEventListener("keydown",(J)=>{if(J.key==="Escape")G6(null),w$("all")});var H6=document.getElementById("theme")||document.getElementById("btn-theme");if(H6)H6.addEventListener("click",()=>MK(p9.theme==="dark"?"light":"dark"));var YK=document.getElementById("export")||document.getElementById("btn-export");if(YK)YK.addEventListener("click",()=>{LK();let J=document.createElement("a");J.download="atlas-plate.png",J.href=fJ.domElement.toDataURL("image/png"),J.click()});function MK(J){p9.theme=J;let Q=LJ[J];if(document.documentElement.setAttribute("data-theme",J==="light"?"light":"dark"),m8.uniforms.uPaper.value.setHex(Q.paper),m8.uniforms.uDeep.value.setHex(Q.paperDeep),m8.uniforms.uGrid.value.setHex(Q.grid),m8.uniforms.uMajor.value.setHex(Q.gridMajor),g9.uniforms.uPaper.value.setHex(Q.paper),g9.uniforms.uInk.value.setHex(Q.ink),g9.uniforms.uMuted.value.setHex(Q.muted),g9.uniforms.uAccent.value.setHex(Q.accent),g9.uniforms.uTints.value=Y6.map(($)=>new C0(XK[J][$])),z9.uniforms.uInk.value.setHex(Q.ink),z9.uniforms.uMuted.value.setHex(Q.muted),z9.uniforms.uAccent.value.setHex(Q.accent),z9.uniforms.uWarm.value.setHex(Q.warm),z9.uniforms.uPaper.value.setHex(Q.paper),I$.uniforms.uInk.value.setHex(Q.muted),I$.uniforms.uPaper.value.setHex(Q.paper),H6)H6.textContent=J==="dark"?"Light":"Dark"}function vN(){let J=Math.max(0.6,Math.min(6,EK/Math.max(0.001,n0.top)));HK.style.setProperty("--lk",String(Math.round(J*100)/100)),document.body.classList.toggle("zoomed-out",J<1.35)}function LK(){vN(),SJ.update(),fJ.render(K9,n0),UK.render(K9,n0)}window.AtlasPrism={renderer:fJ,scene:K9,camera:n0,controls:SJ,state:p9,prismBounds:U6,prismMaterial:g9,ribbonMaterial:z9,gridMaterial:m8};fJ.setAnimationLoop(LK);MK("dark");w$("all");})();
