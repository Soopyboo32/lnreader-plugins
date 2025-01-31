var e=this&&this.__awaiter||function(e,t,a,s){return new(a||(a=Promise))((function(r,i){function l(e){try{n(s.next(e))}catch(e){i(e)}}function o(e){try{n(s.throw(e))}catch(e){i(e)}}function n(e){var t;e.done?r(e.value):(t=e.value,t instanceof a?t:new a((function(e){e(t)}))).then(l,o)}n((s=s.apply(e,t||[])).next())}))},t=this&&this.__generator||function(e,t){var a,s,r,i={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]},l=Object.create(("function"==typeof Iterator?Iterator:Object).prototype);return l.next=o(0),l.throw=o(1),l.return=o(2),"function"==typeof Symbol&&(l[Symbol.iterator]=function(){return this}),l;function o(o){return function(n){return function(o){if(a)throw new TypeError("Generator is already executing.");for(;l&&(l=0,o[0]&&(i=0)),i;)try{if(a=1,s&&(r=2&o[0]?s.return:o[0]?s.throw||((r=s.return)&&r.call(s),0):s.next)&&!(r=r.call(s,o[1])).done)return r;switch(s=0,r&&(o=[2&o[0],r.value]),o[0]){case 0:case 1:r=o;break;case 4:return i.label++,{value:o[1],done:!1};case 5:i.label++,s=o[1],o=[0];continue;case 7:o=i.ops.pop(),i.trys.pop();continue;default:if(!(r=i.trys,(r=r.length>0&&r[r.length-1])||6!==o[0]&&2!==o[0])){i=0;continue}if(3===o[0]&&(!r||o[1]>r[0]&&o[1]<r[3])){i.label=o[1];break}if(6===o[0]&&i.label<r[1]){i.label=r[1],r=o;break}if(r&&i.label<r[2]){i.label=r[2],i.ops.push(o);break}r[2]&&i.ops.pop(),i.trys.pop();continue}o=t.call(e,i)}catch(e){o=[6,e],s=0}finally{a=r=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,n])}}};Object.defineProperty(exports,"__esModule",{value:!0});var a=require("cheerio"),s=require("htmlparser2"),r=require("@libs/fetch"),i=require("@libs/novelStatus"),l=require("@libs/defaultCover");function o(e,t){var a=e.match(/(\d+)$/);a&&a[0]&&(t.chapterNumber=parseInt(a[0]))}var n=new(function(){function n(e){var t,a;this.id=e.id,this.name=e.sourceName,this.icon="multisrc/lightnovelwp/".concat(e.id.toLowerCase(),"/icon.png"),this.site=e.sourceSite;var s=(null===(t=e.options)||void 0===t?void 0:t.versionIncrements)||0;this.version="1.1.".concat(5+s),this.options=null!==(a=e.options)&&void 0!==a?a:{},this.filters=e.filters}return n.prototype.getHostname=function(e){var t=(e=e.split("/")[2]).split(".");return t.pop(),t.join(".")},n.prototype.safeFecth=function(a,s){return e(this,void 0,void 0,(function(){var e,i,l,o,n,c,u,v;return t(this,(function(t){switch(t.label){case 0:return e=a.split("://"),i=e.shift(),l=e[0].replace(/\/\//g,"/"),[4,(0,r.fetchApi)(i+"://"+l)];case 1:if(!(o=t.sent()).ok&&1!=s)throw new Error("Could not reach site ("+o.status+") try to open in webview.");return[4,o.text()];case 2:if(n=t.sent(),c=null===(v=null===(u=n.match(/<title>(.*?)<\/title>/))||void 0===u?void 0:u[1])||void 0===v?void 0:v.trim(),this.getHostname(a)!=this.getHostname(o.url)||c&&("Bot Verification"==c||"You are being redirected..."==c||"Un instant..."==c||"Just a moment..."==c||"Redirecting..."==c))throw new Error("Captcha error, please open in webview (or the website has changed url)");return[2,n]}}))}))},n.prototype.parseNovels=function(e){var t=this;e=(0,a.load)(e).html();var s=[];return(e.match(/<article([\s\S]*?)<\/article>/g)||[]).forEach((function(e){var a=e.match(/<a href="(.*?)".*title="(.*?)"/)||[],r=a[1],i=a[2];if(i&&r){var o=e.match(/<img.*src="(.*?)"(?:\sdata-src="(.*?)")?.*\/?>/)||[],n=void 0;if(r.includes(t.site))n=r.replace(t.site,"");else{var c=r.split("/");c.shift(),c.shift(),c.shift(),n=c.join("/")}s.push({name:i,cover:o[2]||o[1]||l.defaultCover,path:n})}})),s},n.prototype.popularNovels=function(a,s){return e(this,arguments,void 0,(function(e,a){var s,r,i,l,o,n,c,u,v,p=a.filters,h=a.showLatestNovels;return t(this,(function(t){switch(t.label){case 0:for(i in s=null!==(v=null===(u=this.options)||void 0===u?void 0:u.seriesPath)&&void 0!==v?v:"/series/",r=this.site+s+"?page="+e,p||(p=this.filters||{}),h&&(r+="&order=latest"),p)if("object"==typeof p[i].value)for(l=0,o=p[i].value;l<o.length;l++)n=o[l],r+="&".concat(i,"=").concat(n);else p[i].value&&(r+="&".concat(i,"=").concat(p[i].value));return[4,this.safeFecth(r,!1)];case 1:return c=t.sent(),[2,this.parseNovels(c)]}}))}))},n.prototype.parseNovel=function(a){return e(this,void 0,void 0,(function(){var e,r,n,c,u,v,p,h,d,f,b,m,g,w,y,k,N,C,x;return t(this,(function(t){switch(t.label){case 0:return e=this.site,[4,this.safeFecth(e+a,!1)];case 1:return r=t.sent(),n={path:a,name:"",genres:"",summary:"",author:"",artist:"",status:"",chapters:[]},c=!1,u=!1,v=0,p=!1,h=!1,d=!1,f=!1,b=!1,m=!1,g=!1,w=0,y=!1,k=[],N={},C=new s.Parser({onopentag:function(t,a){var s;!n.cover&&(null===(s=a.class)||void 0===s?void 0:s.includes("ts-post-image"))?(n.name=a.title,n.cover=a["data-src"]||a.src||l.defaultCover):"genxed"===a.class||"sertogenre"===a.class?c=!0:c&&"a"===t?u=!0:"div"!==t||"entry-content"!==a.class&&"description"!==a.itemprop?"spe"===a.class||"serl"===a.class?p=!0:p&&"span"===t?h=!0:"div"===t&&"sertostat"===a.class?(p=!0,h=!0,b=!0):a.class&&a.class.includes("eplister")?m=!0:m&&"li"===t?g=!0:g?"a"===t&&void 0===N.path?N.path=a.href.replace(e,"").trim():"epl-num"===a.class?w=1:"epl-title"===a.class?w=2:"epl-date"===a.class?w=3:"epl-price"===a.class&&(w=4):v&&"div"===t&&v++:v++},ontext:function(e){var t,a;if(c)u&&(n.genres+=e+", ");else if(1===v)n.summary+=e.trim();else if(p){if(h){var s=e.toLowerCase().replace(":","").trim();if(d)n.author+=e||"Unknown";else if(f)n.artist+=e||"Unknown";else if(b)switch(s){case"مكتملة":case"completed":case"complété":case"completo":case"completado":case"tamamlandı":n.status=i.NovelStatus.Completed;break;case"مستمرة":case"ongoing":case"en cours":case"em andamento":case"en progreso":case"devam ediyor":n.status=i.NovelStatus.Ongoing;break;case"متوقفة":case"hiatus":case"en pause":case"hiato":case"pausa":case"pausado":case"duraklatıldı":n.status=i.NovelStatus.OnHiatus;break;default:n.status=i.NovelStatus.Unknown}switch(s){case"الكاتب":case"author":case"auteur":case"autor":case"yazar":d=!0;break;case"الحالة":case"status":case"statut":case"estado":case"durum":b=!0;break;case"الفنان":case"artist":case"artiste":case"artista":case"çizer":f=!0}}}else if(m&&g)if(1===w)o(e,N);else if(2===w)N.name=(null===(a=null===(t=e.match(RegExp("^".concat(n.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"\\s*(.+)"))))||void 0===t?void 0:t[1])||void 0===a?void 0:a.trim())||e.trim(),N.chapterNumber||o(e,N);else if(3===w)N.releaseTime=e;else if(4===w){switch(s=e.toLowerCase().trim()){case"free":case"gratuit":case"مجاني":case"livre":case"":y=!1;break;default:y=!0}}},onclosetag:function(e){var t,a,s;c?u?u=!1:(c=!1,n.genres=null===(t=n.genres)||void 0===t?void 0:t.slice(0,-2)):v?"br"===e?n.summary+="\n":"div"===e&&v--:p?h?"span"===e&&(h=!1,d&&n.author?d=!1:f&&n.artist?f=!1:b&&""!==n.status&&(b=!1)):"div"===e&&(p=!1,n.author=null===(a=n.author)||void 0===a?void 0:a.trim(),n.artist=null===(s=n.artist)||void 0===s?void 0:s.trim()):m&&(g?1===w||2===w||3===w||4===w?w=0:"li"===e&&(g=!1,N.chapterNumber||(N.chapterNumber=0),y||k.push(N),N={}):"ul"===e&&(m=!1))}}),C.write(r),C.end(),k.length&&((null===(x=this.options)||void 0===x?void 0:x.reverseChapters)&&k.reverse(),n.chapters=k),[2,n]}}))}))},n.prototype.parseChapter=function(s){return e(this,void 0,void 0,(function(){var e,r,i,l,o;return t(this,(function(t){switch(t.label){case 0:return[4,this.safeFecth(this.site+s,!1)];case 1:if(e=t.sent(),null===(i=this.options)||void 0===i?void 0:i.customJs)try{r=(0,a.load)(e),e=r.html()}catch(e){throw console.error("Error executing customJs:",e),e}return[2,(null===(o=null===(l=e.match(/<div.*class="epcontent ([\s\S]*?)<div.*class="?bottomnav/g))||void 0===l?void 0:l[0].match(/<p.*>([\s\S]*?)<\/p>/g))||void 0===o?void 0:o.join("\n"))||""]}}))}))},n.prototype.searchNovels=function(a,s){return e(this,void 0,void 0,(function(){var e,r;return t(this,(function(t){switch(t.label){case 0:return e=this.site+"page/"+s+"/?s="+a,[4,this.safeFecth(e,!0)];case 1:return r=t.sent(),[2,this.parseNovels(r)]}}))}))},n}())({id:"novelsparadise",sourceSite:"https://novelsparadise.site/",sourceName:"Novels Paradise",options:{lang:"Arabic",reverseChapters:!0},filters:{"genre[]":{type:"Checkbox",label:"النوع",value:[],options:[{label:"+18",value:"18"},{label:"آليه",value:"آليه"},{label:"اكشن",value:"اكشن"},{label:"حريم",value:"حريم"},{label:"خيال",value:"خيال"},{label:"خيال علمي",value:"خيال-علمي"},{label:"دراما",value:"دراما"},{label:"رعب",value:"رعب"},{label:"رومانسي",value:"رومانسي"},{label:"سحر",value:"سحر"},{label:"شبه بشريه",value:"شبه-بشريه"},{label:"صيني",value:"صيني"},{label:"غموض",value:"غموض"},{label:"فان فيكشن",value:"فان-فيكشن"},{label:"فنون قتاليه",value:"فنون-قتاليه"},{label:"كوميديا",value:"كوميديا"},{label:"مغامره",value:"مغامره"}]},"type[]":{type:"Checkbox",label:"النوع",value:[],options:[{label:"روايات صينيه",value:"روايات-صينيه"},{label:"روايات كوريه",value:"روايات-كوريه"},{label:"روايات ويب",value:"روايات-ويب"}]},status:{type:"Picker",label:"الحالة",value:"",options:[{label:"الكل",value:""},{label:"Ongoing",value:"ongoing"},{label:"Hiatus",value:"hiatus"},{label:"Completed",value:"completed"}]},order:{type:"Picker",label:"ترتيب بواسطة",value:"",options:[{label:"Default",value:""},{label:"A-Z",value:"title"},{label:"Z-A",value:"titlereverse"},{label:"أخر التحديثات",value:"update"},{label:"المضاف حديثاً",value:"latest"},{label:"شائع",value:"popular"},{label:"{{advanced_search_series_order_by_rating_label}}",value:"rating"}]}}});exports.default=n;