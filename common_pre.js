﻿"use strict";let г_лРаботаЗавершена=!1;window.setImmediate||(window.setImmediate=(t=>{Проверить("function"==typeof t),setTimeout(t,0)}));const ЗАГЛУШКА=()=>{};function Проверить(t){if(!t)throw new Error("Проверка не пройдена")}function ДобавитьОбработчикИсключений(t){return function(){if(!г_лРаботаЗавершена)try{return t.apply(this,arguments)}catch(t){м_Отладка.ПойманоИсключение(t)}}}function Тип(t){return null===t?"null":typeof t}function ЭтоЧисло(t){return"number"==typeof t&&t==t}function ЭтоОбъект(t){return"object"==typeof t&&null!==t}function ЭтоНепустаяСтрока(t){return"string"==typeof t&&""!==t}function ОграничитьДлинуСтроки(t,n){return t.length<=n?t:`${t.slice(0,n)}---8<---Отрезано ${t.length-n}`}function Узел(t){return"string"==typeof t&&(t=document.getElementById(t)),Проверить(ЭтоОбъект(t)),t}const м_Журнал=(()=>{const t=1e3;let n=null,e=-1;function r(r,o){n&&(Проверить("string"==typeof r&&"string"==typeof o),o=ОграничитьДлинуСтроки(`${r} ${(performance.now()/1e3).toFixed(3)} ${o}`,t),++e===n.length&&(e=0),n[e]=o)}function o(t){Проверить(1===arguments.length),r(" ",t)}function i(t){return n=>"number"==typeof n?n.toFixed(t):"NaN"}return document.currentScript.hasAttribute("data-журнал")&&(n=new Array(1500),o(`[Журнал] Журнал запущен ${performance.now().toFixed()}мс`)),{"Вот":o,"Окак":function(t){Проверить(1===arguments.length),r("~",t)},"Ой":function(t){Проверить(1===arguments.length),r("@",t)},O:function(t){switch(Тип(t)){case"object":return JSON.stringify(t);case"function":return`[function ${t.name}]`;case"symbol":return"[symbol]";default:return String(t)}},F0:i(0),F1:i(1),F2:i(2),F3:i(3),"ПолучитьДанныеДляОтчета":function(){if(!n)return null;const t=e+1;return t===n.length?n:void 0===n[t]?n.slice(0,t):n.slice(t).concat(n.slice(0,t))}}})(),м_i18n=(()=>{function t(t,n){Проверить(ЭтоНепустаяСтрока(t)),Проверить(void 0===n||"string"==typeof n);const e=chrome.i18n.getMessage(t,n);if(!e)throw new Error(`Не найден текст ${t}`);return e}function n(n,e,r){n.insertAdjacentHTML(e,t(r))}return{GetMessage:t,InsertAdjacentHtmlMessage:function(t,e,r){const o=Узел(t);return"content"===e&&(e="beforeend",o.textContent=""),n(o,e,r),o},TranslateDocument:function(e){м_Журнал.Вот("[i18n] Перевод документа");for(let r,o=e.querySelectorAll("*[data-i18n]"),i=0;r=o[i];++i){const e=r.getAttribute("data-i18n"),o=e.indexOf("^");0!==o&&n(r,"afterbegin",-1===o?e:e.slice(0,o)),-1!==o&&(r.title=t(e.slice(o+1)))}},"ФорматироватьЧисло":function(t,n){return Проверить(void 0===n||"number"==typeof n&&n>=0),Number(t).toLocaleString(void 0,void 0===n?void 0:{minimumFractionDigits:n})},"ПеревестиСекундыВСтроку":function(t,n){let e=Math.floor(t/60%60),r=Math.floor(t/60/60)+(e<10?" : 0":" : ")+e;return n&&(r+=((e=Math.floor(t%60))<10?" : 0":" : ")+e),r}}})();