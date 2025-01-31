var e=this&&this.__awaiter||function(e,a,t,l){return new(t||(t=Promise))((function(r,s){function i(e){try{n(l.next(e))}catch(e){s(e)}}function o(e){try{n(l.throw(e))}catch(e){s(e)}}function n(e){var a;e.done?r(e.value):(a=e.value,a instanceof t?a:new t((function(e){e(a)}))).then(i,o)}n((l=l.apply(e,a||[])).next())}))},a=this&&this.__generator||function(e,a){var t,l,r,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]},i=Object.create(("function"==typeof Iterator?Iterator:Object).prototype);return i.next=o(0),i.throw=o(1),i.return=o(2),"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function o(o){return function(n){return function(o){if(t)throw new TypeError("Generator is already executing.");for(;i&&(i=0,o[0]&&(s=0)),s;)try{if(t=1,l&&(r=2&o[0]?l.return:o[0]?l.throw||((r=l.return)&&r.call(l),0):l.next)&&!(r=r.call(l,o[1])).done)return r;switch(l=0,r&&(o=[2&o[0],r.value]),o[0]){case 0:case 1:r=o;break;case 4:return s.label++,{value:o[1],done:!1};case 5:s.label++,l=o[1],o=[0];continue;case 7:o=s.ops.pop(),s.trys.pop();continue;default:if(!(r=s.trys,(r=r.length>0&&r[r.length-1])||6!==o[0]&&2!==o[0])){s=0;continue}if(3===o[0]&&(!r||o[1]>r[0]&&o[1]<r[3])){s.label=o[1];break}if(6===o[0]&&s.label<r[1]){s.label=r[1],r=o;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(o);break}r[2]&&s.ops.pop(),s.trys.pop();continue}o=a.call(e,s)}catch(e){o=[6,e],l=0}finally{t=r=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,n])}}};Object.defineProperty(exports,"__esModule",{value:!0});var t=require("cheerio"),l=require("htmlparser2"),r=require("@libs/fetch"),s=require("@libs/novelStatus"),i=require("@libs/defaultCover");function o(e,a){var t=e.match(/(\d+)$/);t&&t[0]&&(a.chapterNumber=parseInt(t[0]))}var n=new(function(){function n(e){var a,t;this.id=e.id,this.name=e.sourceName,this.icon="multisrc/lightnovelwp/".concat(e.id.toLowerCase(),"/icon.png"),this.site=e.sourceSite;var l=(null===(a=e.options)||void 0===a?void 0:a.versionIncrements)||0;this.version="1.1.".concat(5+l),this.options=null!==(t=e.options)&&void 0!==t?t:{},this.filters=e.filters}return n.prototype.getHostname=function(e){var a=(e=e.split("/")[2]).split(".");return a.pop(),a.join(".")},n.prototype.safeFecth=function(t,l){return e(this,void 0,void 0,(function(){var e,s,i,o,n,u,c,v;return a(this,(function(a){switch(a.label){case 0:return e=t.split("://"),s=e.shift(),i=e[0].replace(/\/\//g,"/"),[4,(0,r.fetchApi)(s+"://"+i)];case 1:if(!(o=a.sent()).ok&&1!=l)throw new Error("Could not reach site ("+o.status+") try to open in webview.");return[4,o.text()];case 2:if(n=a.sent(),u=null===(v=null===(c=n.match(/<title>(.*?)<\/title>/))||void 0===c?void 0:c[1])||void 0===v?void 0:v.trim(),this.getHostname(t)!=this.getHostname(o.url)||u&&("Bot Verification"==u||"You are being redirected..."==u||"Un instant..."==u||"Just a moment..."==u||"Redirecting..."==u))throw new Error("Captcha error, please open in webview (or the website has changed url)");return[2,n]}}))}))},n.prototype.parseNovels=function(e){var a=this;e=(0,t.load)(e).html();var l=[];return(e.match(/<article([\s\S]*?)<\/article>/g)||[]).forEach((function(e){var t=e.match(/<a href="(.*?)".*title="(.*?)"/)||[],r=t[1],s=t[2];if(s&&r){var o=e.match(/<img.*src="(.*?)"(?:\sdata-src="(.*?)")?.*\/?>/)||[],n=void 0;if(r.includes(a.site))n=r.replace(a.site,"");else{var u=r.split("/");u.shift(),u.shift(),u.shift(),n=u.join("/")}l.push({name:s,cover:o[2]||o[1]||i.defaultCover,path:n})}})),l},n.prototype.popularNovels=function(t,l){return e(this,arguments,void 0,(function(e,t){var l,r,s,i,o,n,u,c,v,h=t.filters,p=t.showLatestNovels;return a(this,(function(a){switch(a.label){case 0:for(s in l=null!==(v=null===(c=this.options)||void 0===c?void 0:c.seriesPath)&&void 0!==v?v:"/series/",r=this.site+l+"?page="+e,h||(h=this.filters||{}),p&&(r+="&order=latest"),h)if("object"==typeof h[s].value)for(i=0,o=h[s].value;i<o.length;i++)n=o[i],r+="&".concat(s,"=").concat(n);else h[s].value&&(r+="&".concat(s,"=").concat(h[s].value));return[4,this.safeFecth(r,!1)];case 1:return u=a.sent(),[2,this.parseNovels(u)]}}))}))},n.prototype.parseNovel=function(t){return e(this,void 0,void 0,(function(){var e,r,n,u,c,v,h,p,d,b,f,m,g,y,w,S,k,C,N;return a(this,(function(a){switch(a.label){case 0:return e=this.site,[4,this.safeFecth(e+t,!1)];case 1:return r=a.sent(),n={path:t,name:"",genres:"",summary:"",author:"",artist:"",status:"",chapters:[]},u=!1,c=!1,v=0,h=!1,p=!1,d=!1,b=!1,f=!1,m=!1,g=!1,y=0,w=!1,S=[],k={},C=new l.Parser({onopentag:function(a,t){var l;!n.cover&&(null===(l=t.class)||void 0===l?void 0:l.includes("ts-post-image"))?(n.name=t.title,n.cover=t["data-src"]||t.src||i.defaultCover):"genxed"===t.class||"sertogenre"===t.class?u=!0:u&&"a"===a?c=!0:"div"!==a||"entry-content"!==t.class&&"description"!==t.itemprop?"spe"===t.class||"serl"===t.class?h=!0:h&&"span"===a?p=!0:"div"===a&&"sertostat"===t.class?(h=!0,p=!0,f=!0):t.class&&t.class.includes("eplister")?m=!0:m&&"li"===a?g=!0:g?"a"===a&&void 0===k.path?k.path=t.href.replace(e,"").trim():"epl-num"===t.class?y=1:"epl-title"===t.class?y=2:"epl-date"===t.class?y=3:"epl-price"===t.class&&(y=4):v&&"div"===a&&v++:v++},ontext:function(e){var a,t;if(u)c&&(n.genres+=e+", ");else if(1===v)n.summary+=e.trim();else if(h){if(p){var l=e.toLowerCase().replace(":","").trim();if(d)n.author+=e||"Unknown";else if(b)n.artist+=e||"Unknown";else if(f)switch(l){case"مكتملة":case"completed":case"complété":case"completo":case"completado":case"tamamlandı":n.status=s.NovelStatus.Completed;break;case"مستمرة":case"ongoing":case"en cours":case"em andamento":case"en progreso":case"devam ediyor":n.status=s.NovelStatus.Ongoing;break;case"متوقفة":case"hiatus":case"en pause":case"hiato":case"pausa":case"pausado":case"duraklatıldı":n.status=s.NovelStatus.OnHiatus;break;default:n.status=s.NovelStatus.Unknown}switch(l){case"الكاتب":case"author":case"auteur":case"autor":case"yazar":d=!0;break;case"الحالة":case"status":case"statut":case"estado":case"durum":f=!0;break;case"الفنان":case"artist":case"artiste":case"artista":case"çizer":b=!0}}}else if(m&&g)if(1===y)o(e,k);else if(2===y)k.name=(null===(t=null===(a=e.match(RegExp("^".concat(n.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"\\s*(.+)"))))||void 0===a?void 0:a[1])||void 0===t?void 0:t.trim())||e.trim(),k.chapterNumber||o(e,k);else if(3===y)k.releaseTime=e;else if(4===y){switch(l=e.toLowerCase().trim()){case"free":case"gratuit":case"مجاني":case"livre":case"":w=!1;break;default:w=!0}}},onclosetag:function(e){var a,t,l;u?c?c=!1:(u=!1,n.genres=null===(a=n.genres)||void 0===a?void 0:a.slice(0,-2)):v?"br"===e?n.summary+="\n":"div"===e&&v--:h?p?"span"===e&&(p=!1,d&&n.author?d=!1:b&&n.artist?b=!1:f&&""!==n.status&&(f=!1)):"div"===e&&(h=!1,n.author=null===(t=n.author)||void 0===t?void 0:t.trim(),n.artist=null===(l=n.artist)||void 0===l?void 0:l.trim()):m&&(g?1===y||2===y||3===y||4===y?y=0:"li"===e&&(g=!1,k.chapterNumber||(k.chapterNumber=0),w||S.push(k),k={}):"ul"===e&&(m=!1))}}),C.write(r),C.end(),S.length&&((null===(N=this.options)||void 0===N?void 0:N.reverseChapters)&&S.reverse(),n.chapters=S),[2,n]}}))}))},n.prototype.parseChapter=function(l){return e(this,void 0,void 0,(function(){var e,r,s,i,o;return a(this,(function(a){switch(a.label){case 0:return[4,this.safeFecth(this.site+l,!1)];case 1:if(e=a.sent(),null===(s=this.options)||void 0===s?void 0:s.customJs)try{r=(0,t.load)(e),e=r.html()}catch(e){throw console.error("Error executing customJs:",e),e}return[2,(null===(o=null===(i=e.match(/<div.*class="epcontent ([\s\S]*?)<div.*class="?bottomnav/g))||void 0===i?void 0:i[0].match(/<p.*>([\s\S]*?)<\/p>/g))||void 0===o?void 0:o.join("\n"))||""]}}))}))},n.prototype.searchNovels=function(t,l){return e(this,void 0,void 0,(function(){var e,r;return a(this,(function(a){switch(a.label){case 0:return e=this.site+"page/"+l+"/?s="+t,[4,this.safeFecth(e,!0)];case 1:return r=a.sent(),[2,this.parseNovels(r)]}}))}))},n}())({id:"moonlightnovel",sourceSite:"https://moonlightnovel.com/",sourceName:"Moonlight Novels",options:{versionIncrements:1,lang:"English",reverseChapters:!0},filters:{"genre[]":{type:"Checkbox",label:"Genre",value:[],options:[{label:"Action",value:"action"},{label:"Adult",value:"adult"},{label:"Adventure",value:"adventure"},{label:"Apocalypse",value:"apocalypse"},{label:"Childcare",value:"childcare"},{label:"Comedy",value:"comedy"},{label:"Contemporary Romance",value:"contemporary-romance"},{label:"Drama",value:"drama"},{label:"Fantasy",value:"fantasy"},{label:"Gender Bender",value:"gender-bender"},{label:"Harem",value:"harem"},{label:"Historical",value:"historical"},{label:"Horror",value:"horror"},{label:"Idol",value:"idol"},{label:"Josei",value:"josei"},{label:"Martial Arts",value:"martial-arts"},{label:"Mature",value:"mature"},{label:"Mecha",value:"mecha"},{label:"Modern",value:"modern"},{label:"Mystery",value:"mystery"},{label:"Omegaverse",value:"omegaverse"},{label:"Psychological",value:"psychological"},{label:"Rebirth",value:"rebirth"},{label:"Revenge",value:"revenge"},{label:"Romance",value:"romance"},{label:"salvation",value:"salvation"},{label:"School Life",value:"school-life"},{label:"Sci-fi",value:"sci-fi"},{label:"Seinen",value:"seinen"},{label:"Shoujo",value:"shoujo"},{label:"Shounen",value:"shounen"},{label:"Shounen Ai",value:"shounen-ai"},{label:"Slice of Life",value:"slice-of-life"},{label:"Smut",value:"smut"},{label:"Supernatural",value:"supernatural"},{label:"Tragedy",value:"tragedy"},{label:"Transmigration",value:"transmigration"},{label:"Western Style",value:"western-style"},{label:"Xianxia",value:"xianxia"},{label:"Xuanhuan",value:"xuanhuan"},{label:"Yaoi",value:"yaoi"},{label:"Yuri",value:"yuri"}]},"type[]":{type:"Checkbox",label:"Type",value:[],options:[{label:"Chinese",value:"chinese"},{label:"Indonesian",value:"indonesian"},{label:"Japanese",value:"japanese"},{label:"Korean",value:"korean"},{label:"Original",value:"original"},{label:"Web Novel",value:"web-novel"}]},status:{type:"Picker",label:"Status",value:"",options:[{label:"All",value:""},{label:"Ongoing",value:"ongoing"},{label:"Hiatus",value:"hiatus"},{label:"Completed",value:"completed"}]},order:{type:"Picker",label:"Order by",value:"",options:[{label:"Default",value:""},{label:"A-Z",value:"title"},{label:"Z-A",value:"titlereverse"},{label:"Latest Update",value:"update"},{label:"Latest Added",value:"latest"},{label:"Popular",value:"popular"},{label:"Rating",value:"rating"}]}}});exports.default=n;