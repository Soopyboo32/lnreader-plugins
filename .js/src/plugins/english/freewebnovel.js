var e=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(a,l){function i(e){try{u(n.next(e))}catch(e){l(e)}}function o(e){try{u(n.throw(e))}catch(e){l(e)}}function u(e){var t;e.done?a(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(i,o)}u((n=n.apply(e,t||[])).next())}))},t=this&&this.__generator||function(e,t){var r,n,a,l={label:0,sent:function(){if(1&a[0])throw a[1];return a[1]},trys:[],ops:[]},i=Object.create(("function"==typeof Iterator?Iterator:Object).prototype);return i.next=o(0),i.throw=o(1),i.return=o(2),"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function o(o){return function(u){return function(o){if(r)throw new TypeError("Generator is already executing.");for(;i&&(i=0,o[0]&&(l=0)),l;)try{if(r=1,n&&(a=2&o[0]?n.return:o[0]?n.throw||((a=n.return)&&a.call(n),0):n.next)&&!(a=a.call(n,o[1])).done)return a;switch(n=0,a&&(o=[2&o[0],a.value]),o[0]){case 0:case 1:a=o;break;case 4:return l.label++,{value:o[1],done:!1};case 5:l.label++,n=o[1],o=[0];continue;case 7:o=l.ops.pop(),l.trys.pop();continue;default:if(!(a=l.trys,(a=a.length>0&&a[a.length-1])||6!==o[0]&&2!==o[0])){l=0;continue}if(3===o[0]&&(!a||o[1]>a[0]&&o[1]<a[3])){l.label=o[1];break}if(6===o[0]&&l.label<a[1]){l.label=a[1],a=o;break}if(a&&l.label<a[2]){l.label=a[2],l.ops.push(o);break}a[2]&&l.ops.pop(),l.trys.pop();continue}o=t.call(e,l)}catch(e){o=[6,e],n=0}finally{r=a=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,u])}}};Object.defineProperty(exports,"__esModule",{value:!0});var r=require("@libs/fetch"),n=require("cheerio"),a=require("@libs/filterInputs"),l=function(){function l(){this.id="FWN.com",this.name="Free Web Novel",this.site="https://freewebnovel.com/",this.version="1.1.1",this.icon="src/en/freewebnovel/icon.png",this.filters={genres:{type:a.FilterTypes.Picker,label:"Genre",value:"",options:[{label:"Action",value:"genre/Action/"},{label:"Adult",value:"genre/Adult/"},{label:"Adventure",value:"genre/Adventure/"},{label:"Comedy",value:"genre/Comedy/"},{label:"Drama",value:"genre/Drama/"},{label:"Eastern",value:"genre/Eastern"},{label:"Ecchi",value:"genre/Ecchi/"},{label:"Fantasy",value:"genre/Fantasy/"},{label:"Gender Bender",value:"genre/Gender+Bender/"},{label:"Harem",value:"genre/Harem/"},{label:"Historical",value:"genre/Historical/"},{label:"Horror",value:"genre/Horror/"},{label:"Josei",value:"genre/Josei/"},{label:"Game",value:"genre/Game/"},{label:"Martial Arts",value:"genre/Martial+Arts/"},{label:"Mature",value:"genre/Mature/"},{label:"Mecha",value:"genre/Mecha/"},{label:"Mystery",value:"genre/Mystery/"},{label:"Psychological",value:"genre/Psychological/"},{label:"Reincarnation",value:"genre/Reincarnation"},{label:"Romance",value:"genre/Romance/"},{label:"School Life",value:"genre/School+Life/"},{label:"Sci-fi",value:"genre/Sci-fi/"},{label:"Seinen",value:"genre/Seinen/"},{label:"Shoujo",value:"genre/Shoujo/"},{label:"Shounen Ai",value:"genre/Shounen+Ai/"},{label:"Shounen",value:"genre/Shounen/"},{label:"Slice of Life",value:"genre/Slice+of+Life/"},{label:"Smut",value:"genre/Smut/"},{label:"Sports",value:"genre/Sports/"},{label:"Supernatural",value:"genre/Supernatural/"},{label:"Tragedy",value:"genre/Tragedy/"},{label:"Wuxia",value:"genre/Wuxia/"},{label:"Xianxia",value:"genre/Xianxia/"},{label:"Xuanhuan",value:"genre/Xuanhuan/"},{label:"Yaoi",value:"genre/Yaoi/"}]}}}return l.prototype.getCheerio=function(a){return e(this,void 0,void 0,(function(){var e,l;return t(this,(function(t){switch(t.label){case 0:return[4,(0,r.fetchApi)(a)];case 1:if(!(e=t.sent()).ok)throw new Error("Could not reach site (".concat(e.status,": ").concat(e.statusText,") try to open in webview."));return l=n.load,[4,e.text()];case 2:return[2,l.apply(void 0,[t.sent()])]}}))}))},l.prototype.parseNovels=function(e){var t=this;return e(".li-row").map((function(r,n){var a;return{name:e(n).find(".tit").text()||"",cover:t.site+e(n).find("img").attr("src"),path:(null===(a=e(n).find("h3 > a").attr("href"))||void 0===a?void 0:a.slice(1))||""}})).get().filter((function(e){return e.name&&e.path}))},l.prototype.popularNovels=function(r,n){return e(this,arguments,void 0,(function(e,r){var n,a,l=r.showLatestNovels,i=r.filters;return t(this,(function(t){switch(t.label){case 0:if(n=this.site,l)n+="sort/latest-novels/";else if(i&&i.genres&&""!==i.genres.value)n+=i.genres.value;else{if(n+="most-popular/",1!=e)return[2,[]];e=0}return n+=e,[4,this.getCheerio(n)];case 1:return a=t.sent(),[2,this.parseNovels(a)]}}))}))},l.prototype.parseNovel=function(r){return e(this,void 0,void 0,(function(){var e,n,a;return t(this,(function(t){switch(t.label){case 0:return[4,this.getCheerio(this.site+r)];case 1:return e=t.sent(),(n={path:r,name:e("h1.tit").text(),cover:this.site+e(".pic > img").attr("src"),summary:e(".inner").text().trim()}).genres=e("[title=Genre]").next().text().replace(/[\t\n]/g,""),n.author=e("[title=Author]").next().text().replace(/[\t\n]/g,""),n.status=e("[title=Status]").next().text().replace(/[\t\n]/g,""),n.genres=e("[title=Genre]").next().text().trim().replace(/[\t\n]/g,",").replace(/, /g,","),a=e("#idData > li > a").map((function(t,n){var a;return{name:e(n).attr("title")||"Chapter "+(t+1),path:(null===(a=e(n).attr("href"))||void 0===a?void 0:a.slice(1))||r.replace(".html","/chapter-"+(t+1)+".html"),releaseTime:null,chapterNumber:t+1}})).get(),n.chapters=a,[2,n]}}))}))},l.prototype.parseChapter=function(r){return e(this,void 0,void 0,(function(){var e;return t(this,(function(t){switch(t.label){case 0:return[4,this.getCheerio(this.site+r)];case 1:return(e=t.sent())("style").text().includes("p:nth-last-child(1)")&&e("div.txt").find("p:last-child").remove(),[2,(e("div.txt").html()||"").replace(/<p>\s*(?:(?:This (?:chapter is updated by|content is taken from)|Follow current novels on|Updated from) )?(?:[ƒfF][Rrɾг][Eēeё][Eēёe][Wwω][Eёēe][Bbɓ][Nnɳη][Oø૦ѳσo][Vѵv][Eёeē][LlℓɭI\|]\.\s?[Cƈcç][O૦σøoѳ][M๓ɱm]|ꜰʀᴇᴇᴡᴇʙɴᴏᴠᴇʟ)\.?/g,"<p>").replace(/<p>\s*Visit for the best novel reading experience\.?/g,"<p>")]}}))}))},l.prototype.searchNovels=function(a){return e(this,void 0,void 0,(function(){var e,l,i,o,u;return t(this,(function(t){switch(t.label){case 0:return[4,(0,r.fetchApi)(this.site+"search",{headers:{"Content-Type":"application/x-www-form-urlencoded"},method:"POST",body:new URLSearchParams({searchkey:a}).toString()})];case 1:if(!(e=t.sent()).ok)throw new Error("Could not reach site ("+e.status+") try to open in webview.");return i=n.load,[4,e.text()];case 2:if(l=i.apply(void 0,[t.sent()]),o=(null===(u=l("script").text().match(/alert\((.*?)\)/))||void 0===u?void 0:u[1])||"")throw new Error(o);return[2,this.parseNovels(l)]}}))}))},l}();exports.default=new l;