'use strict';

const ХРАНИТЬ_СОСТОЯНИЕ_КАНАЛА = 2e4;

const ЭТО_НЕ_КОД_КАНАЛА = new Set([ 'directory', 'embed', 'friends', 'inventory', 'login', 'logout', 'manager', 'messages', 'payments', 'settings', 'signup', 'subscriptions' ]);

let г_оРазобранныйАдрес = null;

let г_сПричинаСменыАдреса = '';

let г_оЗапрос = null;

let г_сКодКанала = '';

let г_чПоследняяПроверка = 0;

let г_лИдетТрансляция = false;

const м_Отладка = {
	ПойманоИсключение(пИсключение) {
		if (!г_лРаботаЗавершена) {
			console.error(ПеревестиИсключениеВСтроку(пИсключение));
			ЗавершитьРаботу();
		}
		throw void 0;
	},
	ЗавершитьРаботуИПоказатьСообщение(сКодСообщения) {
		if (!г_лРаботаЗавершена) {
			console.error(сКодСообщения);
			ЗавершитьРаботу();
		}
		throw void 0;
	}
};

function ВставитьНаСтраницу(фВставить) {
	const узСкрипт = document.createElement('script');
	узСкрипт.textContent = `\n\t\t'use strict';\n\t\t(${фВставить})();\n\t`;
	(document.head || document.documentElement).appendChild(узСкрипт);
	узСкрипт.remove();
}

function ЭтотАдресМожноПеренаправлять(oUrl) {
	return !oUrl.search.includes(АДРЕС_НЕ_ПЕРЕНАПРАВЛЯТЬ);
}

function ПолучитьНеперенаправляемыйАдрес(oUrl) {
	return `${oUrl.protocol}//${oUrl.host}${oUrl.pathname}` + (oUrl.search.length > 1 ? `${oUrl.search}&${АДРЕС_НЕ_ПЕРЕНАПРАВЛЯТЬ}` : `?${АДРЕС_НЕ_ПЕРЕНАПРАВЛЯТЬ}`) + oUrl.hash;
}

function ЗапретитьАвтоперенаправлениеЭтойСтраницы() {
	if (ЭтотАдресМожноПеренаправлять(location)) {
		history.replaceState(history.state, '', ПолучитьНеперенаправляемыйАдрес(location));
	}
}

РазобратьАдрес.СТРАНИЦА_НЕИЗВЕСТНАЯ = 1;

РазобратьАдрес.СТРАНИЦА_ВОЗМОЖНО_ПРЯМАЯ_ТРАНСЛЯЦИЯ = 2;

РазобратьАдрес.СТРАНИЦА_ЧАТ_КАНАЛА = 3;

function РазобратьАдрес(oUrl) {
	let лМобильнаяВерсия = false;
	let чСтраница = РазобратьАдрес.СТРАНИЦА_НЕИЗВЕСТНАЯ;
	let сКодКанала = '';
	let лМожноПеренаправлять = false;
	if (oUrl.protocol === 'https:' && (oUrl.host === 'www.twitch.tv' || oUrl.host === 'm.twitch.tv')) {
		лМобильнаяВерсия = oUrl.host === 'm.twitch.tv';
		const мсЧасти = oUrl.pathname.split('/');
		if (мсЧасти.length <= 3 && мсЧасти[1] && !мсЧасти[2]) {
			if (!ЭТО_НЕ_КОД_КАНАЛА.has(мсЧасти[1])) {
				чСтраница = РазобратьАдрес.СТРАНИЦА_ВОЗМОЖНО_ПРЯМАЯ_ТРАНСЛЯЦИЯ;
				сКодКанала = мсЧасти[1];
				лМожноПеренаправлять = ЭтотАдресМожноПеренаправлять(oUrl);
			}
		} else if ((мсЧасти[1] === 'embed' || мсЧасти[1] === 'popout') && мсЧасти[2] && мсЧасти[3] === 'chat') {
			чСтраница = РазобратьАдрес.СТРАНИЦА_ЧАТ_КАНАЛА;
			сКодКанала = мсЧасти[2];
		}
	}
	м_Журнал.Окак(`[Twitch 5] Адрес разобран: Страница=${чСтраница} КодКанала=${сКодКанала} МожноПеренаправлять=${лМожноПеренаправлять}`);
	this.лМобильнаяВерсия = лМобильнаяВерсия;
	this.чСтраница = чСтраница;
	this.сКодКанала = сКодКанала;
	this.лМожноПеренаправлять = лМожноПеренаправлять;
}

function ПолучитьАдресНашегоПроигрывателя(сКодКанала) {
	return `${chrome.extension.getURL('player.html')}?channel=${сКодКанала}`;
}

function ЗапроситьСостояниеКанала(оРазобранныйАдрес) {
	if (!оРазобранныйАдрес.лМожноПеренаправлять || !м_Настройки.Получить('лАвтоперенаправлениеРазрешено')) {
		return;
	}
	if (!г_оЗапрос && г_сКодКанала === оРазобранныйАдрес.сКодКанала && performance.now() - г_чПоследняяПроверка < ХРАНИТЬ_СОСТОЯНИЕ_КАНАЛА) {
		return;
	}
	if (г_оЗапрос && г_сКодКанала === оРазобранныйАдрес.сКодКанала) {
		return;
	}
	ОтменитьЗапрос();
	г_сКодКанала = оРазобранныйАдрес.сКодКанала;
	г_чПоследняяПроверка = -1;
	ОтправитьЗапрос();
}

function ИзмененАдресСтраницы(сПричина) {
	г_оРазобранныйАдрес = new РазобратьАдрес(location);
	г_сПричинаСменыАдреса = сПричина;
	if (!г_оРазобранныйАдрес.лМожноПеренаправлять || !м_Настройки.Получить('лАвтоперенаправлениеРазрешено')) {
		if (г_чПоследняяПроверка === -2) {
			г_чПоследняяПроверка = -1;
		}
		return false;
	}
	if (!г_оЗапрос && г_сКодКанала === г_оРазобранныйАдрес.сКодКанала && performance.now() - г_чПоследняяПроверка < ХРАНИТЬ_СОСТОЯНИЕ_КАНАЛА) {
		if (г_лИдетТрансляция) {
			ПеренаправитьНаНашПроигрыватель(г_сКодКанала);
			return true;
		}
		return false;
	}
	if (г_оЗапрос && г_сКодКанала === г_оРазобранныйАдрес.сКодКанала) {
		г_чПоследняяПроверка = -2;
		return false;
	}
	ОтменитьЗапрос();
	г_сКодКанала = г_оРазобранныйАдрес.сКодКанала;
	г_чПоследняяПроверка = -2;
	ОтправитьЗапрос();
	return false;
}

function ОтменитьЗапрос() {
	if (г_оЗапрос) {
		м_Журнал.Окак('[Twitch 5] Отменяю незавершенный запрос');
		г_оЗапрос.abort();
	}
}

const ЗАПРОС_СОСТОЯНИЯ_ТРАНСЛЯЦИИ = `query WebPlayerChannelStream($channel: String) {
    channel: user(login: $channel) {
        stream {
            broadcasterSoftware
            isEncrypted
        }
    }
}`;

function ОтправитьЗапрос() {
	м_Журнал.Окак(`[Twitch 5] Посылаю запрос для канала ${г_сКодКанала}`);
	г_оЗапрос = new XMLHttpRequest();
	г_оЗапрос.addEventListener('loadend', ОбработатьОтвет);
	г_оЗапрос.open('POST', 'https://api.twitch.tv/gql');
	г_оЗапрос.responseType = 'json';
	г_оЗапрос.timeout = 1e4;
	г_оЗапрос.setRequestHeader('Client-ID', 'jzkbprff40iqj646a697cyrvl0zt2m6');
	г_оЗапрос.setRequestHeader('Content-Type', 'application/json');
	г_оЗапрос.send(`{"query":${JSON.stringify(ЗАПРОС_СОСТОЯНИЯ_ТРАНСЛЯЦИИ)},"variables":{"channel":${JSON.stringify(г_сКодКанала)}}}`);
}

function ОбработатьОтвет() {
	м_Журнал.Окак(`[Twitch 5] Получен ответ status=${this.status} response=${!!this.response}`);
	г_оЗапрос = null;
	if (this.status !== 200 || !this.response) {
		г_чПоследняяПроверка = 0;
	} else {
		const лПеренаправить = г_чПоследняяПроверка === -2;
		г_чПоследняяПроверка = performance.now();
		г_лИдетТрансляция = false;
		try {
			г_лИдетТрансляция = this.response.data.channel.stream.isEncrypted === false;
		} catch (и) {}
		if (лПеренаправить && г_лИдетТрансляция) {
			ПеренаправитьНаНашПроигрыватель(г_сКодКанала);
		}
	}
}

function ЗапуститьНашПроигрыватель(сКодКанала) {
	const сАдресПроигрывателя = ПолучитьАдресНашегоПроигрывателя(сКодКанала);
	м_Журнал.Окак(`[Twitch 5] Перехожу на страницу ${сАдресПроигрывателя}`);
	ЗапретитьАвтоперенаправлениеЭтойСтраницы();
	location.assign(сАдресПроигрывателя);
}

function ПеренаправитьНаНашПроигрыватель(сКодКанала) {
	const сАдресПроигрывателя = ПолучитьАдресНашегоПроигрывателя(сКодКанала);
	м_Журнал.Окак(`[Twitch 5] Меняю адрес страницы с ${location.href} на ${сАдресПроигрывателя}`);
	document.documentElement.setAttribute('data-tw5-перенаправление', '');
	if (!navigator.userAgent.includes('OPR/') && !navigator.userAgent.includes('Vivaldi/')) {
		location.replace(сАдресПроигрывателя);
	} else {
		if (г_сПричинаСменыАдреса === 'pushstate') {
			history.back();
		} else {
			ЗапретитьАвтоперенаправлениеЭтойСтраницы();
		}
		location.assign(сАдресПроигрывателя);
	}
}

function ОбработатьPointerDownИClick(оСобытие) {
	if (г_оРазобранныйАдрес) {
		const узСсылка = оСобытие.target.closest('a[href]');
		if (узСсылка && оСобытие.isPrimary !== false && оСобытие.button === ЛЕВАЯ_КНОПКА && !оСобытие.shiftKey && !оСобытие.ctrlKey && !оСобытие.altKey && !оСобытие.metaKey) {
			м_Журнал.Окак(`[Twitch 5] Произошло событие ${оСобытие.type} у ссылки ${узСсылка.href}`);
			ЗапроситьСостояниеКанала(new РазобратьАдрес(узСсылка));
		}
	}
}

function ОбработатьPopState(оСобытие) {
	if (г_оРазобранныйАдрес) {
		м_Журнал.Окак(`[Twitch 5] Произошло событие popstate ${location.href}`);
		if (ВЕРСИЯ_ДВИЖКА_БРАУЗЕРА < 67) {
			document.title = 'Twitch';
		}
		if (document.documentElement.hasAttribute('data-tw5-перенаправление') || ИзмененАдресСтраницы('popstate')) {
			м_Журнал.Окак('[Twitch 5] Скрываю событие popstate');
			оСобытие.stopImmediatePropagation();
			оСобытие.stopPropagation();
		}
	}
}

function ОбработатьPushState(оСобытие) {
	м_Журнал.Окак(`[Twitch 5] Произошло событие tw5-pushstate ${location.href}`);
	ИзмененАдресСтраницы('pushstate');
}

function ОбработатьЗапускНашегоПроигрывателя(оСобытие) {
	оСобытие.preventDefault();
	if (оСобытие.button === ЛЕВАЯ_КНОПКА && г_оРазобранныйАдрес.чСтраница === РазобратьАдрес.СТРАНИЦА_ВОЗМОЖНО_ПРЯМАЯ_ТРАНСЛЯЦИЯ) {
		ЗапуститьНашПроигрыватель(г_оРазобранныйАдрес.сКодКанала);
	} else {
		м_Журнал.Окак(`[Twitch 5] Не запускать проигрыватель Кнопка=${оСобытие.button} Страница=${г_оРазобранныйАдрес.чСтраница}`);
	}
}

function ОбработатьПереключениеАвтоперенаправления(оСобытие) {
	оСобытие.preventDefault();
	const л = !м_Настройки.Получить('лАвтоперенаправлениеРазрешено');
	м_Журнал.Окак(`[Twitch 5] Автоперенаправление разрешено: ${л}`);
	м_Настройки.Изменить('лАвтоперенаправлениеРазрешено', л);
	ОбновитьНашуКнопку();
}

function ОбработатьЗакрытиеСправки(оСобытие) {
	оСобытие.preventDefault();
	м_Журнал.Окак('[Twitch 5] Закрываю справку');
	оСобытие.currentTarget.classList.remove('tw5-справка');
	оСобытие.currentTarget.removeEventListener('mouseover', ОбработатьЗакрытиеСправки);
	оСобытие.currentTarget.removeEventListener('touchstart', ОбработатьЗакрытиеСправки);
	м_Настройки.Изменить('лАвтоперенаправлениеЗамечено', true);
}

function ПолучитьНашуКнопку() {
	return document.getElementById('tw5-автоперенаправление');
}

function ОбновитьНашуКнопку() {
	ПолучитьНашуКнопку().classList.toggle('tw5-запрещено', !м_Настройки.Получить('лАвтоперенаправлениеРазрешено'));
}

function ВставитьНашуКнопку() {
	if (!г_оРазобранныйАдрес.лМобильнаяВерсия) {
		const сузКудаВставлять = document.getElementsByClassName('top-nav__nav-items-container');
		if (сузКудаВставлять.length === 0) {
			return false;
		}
		м_Журнал.Окак('[Twitch 5] Вставляю нашу кнопку');
		сузКудаВставлять[0].nextElementSibling.insertAdjacentHTML('afterend', `
		<div class="tw5-автоперенаправление tw5-js-удалить tw-align-self-center tw-flex-grow-0 tw-flex-shrink-0 tw-flex-nowrap tw-mg-x-05">
			<div class="tw-inline-flex tw-tooltip-wrapper">
				<button id="tw5-автоперенаправление" class="tw-button-icon tw-button-icon--overlay tw-button-icon--large">
					<span class="tw-button-icon__icon">
						<figure class="tw-svg">
							<svg class="tw-svg__asset tw-svg__asset--inherit" width="20px" height="20px" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
								<path fill-opacity="0.85" d="M1.145 0.001h7.975v3.176h-4.49l0.294 3.253h4.198v3.168h-7.106zM2.152 11.193h3.189l0.224 2.54 3.553 0.951v3.316l-6.52-1.819z"/>
								<path d="M16.855 0.001h-7.96v3.176h7.666zM16.275 6.429h-7.379v3.176h3.917l-0.37 4.128-3.547 0.951v3.301l6.505-1.804z"/>
							</svg>
						</figure>
					</span>
				</button>
				<div class="tw5-многостроч tw-tooltip tw-tooltip--down tw-tooltip--align-center">
					${м_i18n.GetMessage('F0600')}
				</div>
			</div>
			<style>
				.tw5-запрещено .tw-svg
				{
					opacity: .4 !important;
				}
				.tw5-многостроч
				{
					line-height: 1.4 !important;
				}
				.tw5-справка > .tw-tooltip
				{
					display: block !important;
					color: white !important;
					background: #f00000 !important;
					pointer-events: auto !important;
					cursor: pointer !important;
				}
				.tw5-справка > .tw-tooltip::after
				{
					background: #f00000 !important;
				}
			</style>
		</div>
		`);
	} else {
		const сузКудаВставлять = document.getElementsByClassName('mw-top-nav__menu');
		if (сузКудаВставлять.length === 0) {
			return false;
		}
		м_Журнал.Окак('[Twitch 5] Вставляю нашу кнопку для мобильного сайта');
		сузКудаВставлять[0].insertAdjacentHTML('beforebegin', `
		<div class="tw5-автоперенаправление tw5-js-удалить mw-top-nav__menu tw-tooltip-wrapper">
			<button id="tw5-автоперенаправление" class="tw-button-icon tw-button-icon--overlay tw-button-icon--large">
				<span class="tw-button-icon__icon">
					<figure class="tw-svg">
						<svg class="tw-svg__asset tw-svg__asset--more tw-svg__asset--inherit" viewBox="-4 -4 26 26" xmlns="http://www.w3.org/2000/svg">
							<path fill-opacity="0.85" d="M1.145 0.001h7.975v3.176h-4.49l0.294 3.253h4.198v3.168h-7.106zM2.152 11.193h3.189l0.224 2.54 3.553 0.951v3.316l-6.52-1.819z"/>
							<path d="M16.855 0.001h-7.96v3.176h7.666zM16.275 6.429h-7.379v3.176h3.917l-0.37 4.128-3.547 0.951v3.301l6.505-1.804z"/>
						</svg>
					</figure>
				</span>
			</button>
			<style>
				.tw5-запрещено .tw-svg
				{
					opacity: .4 !important;
				}
			</style>
		</div>
		`);
	}
	const узКнопка = ПолучитьНашуКнопку();
	узКнопка.addEventListener('click', ОбработатьЗапускНашегоПроигрывателя);
	узКнопка.addEventListener('contextmenu', ОбработатьПереключениеАвтоперенаправления);
	if (!г_оРазобранныйАдрес.лМобильнаяВерсия && !м_Настройки.Получить('лАвтоперенаправлениеЗамечено')) {
		узКнопка.parentNode.classList.add('tw5-справка');
		узКнопка.parentNode.addEventListener('mouseover', ОбработатьЗакрытиеСправки);
		узКнопка.parentNode.addEventListener('touchstart', ОбработатьЗакрытиеСправки, {
			passive: false
		});
	}
	ОбновитьНашуКнопку();
	return true;
}

function СледитьЗаРазметкойСтраницы() {
	if (ВставитьНашуКнопку() && !г_оРазобранныйАдрес.лМобильнаяВерсия) {
		return;
	}
	new MutationObserver((моЗаписи, оНаблюдатель) => {
		if (!ПолучитьНашуКнопку() && ВставитьНашуКнопку() && !г_оРазобранныйАдрес.лМобильнаяВерсия) {
			оНаблюдатель.disconnect();
		}
	}).observe(document.documentElement, {
		childList: true,
		subtree: true
	});
}

function ПерехватитьФункции() {
	let _лНеПерехватывать = false;
	window.addEventListener('tw5-неперехватывать', () => {
		_лНеПерехватывать = true;
	});
	const fPushState = history.pushState;
	history.pushState = function(state, title) {
		if (_лНеПерехватывать) {
			return fPushState.apply(this, arguments);
		}
		if (!document.documentElement.hasAttribute('data-tw5-перенаправление')) {
			const сБыло = location.pathname;
			fPushState.apply(this, arguments);
			if (сБыло !== location.pathname) {
				document.title = 'Twitch';
				window.dispatchEvent(new CustomEvent('tw5-pushstate'));
			}
		}
	};
	const oTitleDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
	Object.defineProperty(document, 'title', {
		configurable: oTitleDescriptor.configurable,
		enumerable: oTitleDescriptor.enumerable,
		get() {
			return oTitleDescriptor.get.apply(this, arguments);
		},
		set(title) {
			if (_лНеПерехватывать) {
				return oTitleDescriptor.set.apply(this, arguments);
			}
			if (!this.documentElement.hasAttribute('data-tw5-перенаправление')) {
				oTitleDescriptor.set.apply(this, arguments);
			}
		}
	});
}

function ЖдатьЗагрузкуДомика() {
	return new Promise((фВыполнить, фОтказаться) => {
		м_Журнал.Окак(`[Twitch 5] document.readyState=${document.readyState}`);
		if (document.readyState !== 'loading') {
			фВыполнить();
		} else {
			document.addEventListener('DOMContentLoaded', function ОбработатьЗагрузкуДомика() {
				try {
					м_Журнал.Окак(`[Twitch 5] document.readyState=${document.readyState}`);
					document.removeEventListener('DOMContentLoaded', ОбработатьЗагрузкуДомика);
					фВыполнить();
				} catch (пИсключение) {
					фОтказаться(пИсключение);
				}
			});
		}
	});
}

function ВставитьСторонниеРасширения() {
	chrome.runtime.sendMessage({
		сЗапрос: 'ВставитьСторонниеРасширения'
	}, оСообщение => {
		if (chrome.runtime.lastError) {
			м_Журнал.Окак(`[Twitch 5] Не удалось послать запрос на вставку сторонних расширений: ${chrome.runtime.lastError.message}`);
			return;
		}
		if (оСообщение.сСторонниеРасширения === '') {
			return;
		}
		ЖдатьЗагрузкуДомика().then(() => {
			м_Журнал.Окак(`[Twitch 5] Вставляю сторонние расширения: ${оСообщение.сСторонниеРасширения}`);
			if (оСообщение.сСторонниеРасширения.includes('BTTV ')) {
				const узСкрипт = document.createElement('script');
				узСкрипт.src = 'https://cdn.betterttv.net/betterttv.js';
				document.head.appendChild(узСкрипт);
			}
			if (оСообщение.сСторонниеРасширения.includes('FFZ ')) {
				const узСкрипт = document.createElement('script');
				узСкрипт.src = 'https://cdn.frankerfacez.com/script/script.min.js';
				document.head.appendChild(узСкрипт);
			}
			if (оСообщение.сСторонниеРасширения.includes('FFZAP ')) {
				const узСкрипт = document.createElement('script');
				узСкрипт.src = 'https://cdn.ffzap.com/ffz-ap.min.js';
				document.head.appendChild(узСкрипт);
			}
		});
	});
}

function ИзменитьСтильЧата() {
	const узСтиль = document.createElement('link');
	узСтиль.rel = 'stylesheet';
	узСтиль.href = chrome.extension.getURL('content.css');
	узСтиль.className = 'tw5-js-удалить';
	(document.head || document.documentElement).appendChild(узСтиль);
}

function ИзменитьПоведениеЧата() {
	if (window !== window.top) {
		window.addEventListener('click', оСобытие => {
			if (оСобытие.button !== ЛЕВАЯ_КНОПКА) {
				return;
			}
			const узСсылка = оСобытие.target.closest('a[href^="http:"],a[href^="https:"],a[href]:not([href=""]):not([href^="#"]):not([href*=":"])');
			if (!узСсылка) {
				return;
			}
			м_Журнал.Окак(`[Twitch 5] Открываю ссылку в новой вкладке: ${узСсылка.getAttribute('href')}`);
			узСсылка.target = '_blank';
			оСобытие.stopImmediatePropagation();
			оСобытие.stopPropagation();
		}, true);
	}
	window.addEventListener('click', function ОбработатьОткрытиеКарточки() {
		const узКарточка = document.getElementsByClassName('viewer-card-layer')[0];
		if (узКарточка) {
			window.removeEventListener('click', ОбработатьОткрытиеКарточки, false);
			new MutationObserver(() => {
				const узКарточка2 = узКарточка.firstElementChild;
				if (узКарточка2) {
					const оСтиль = getComputedStyle(узКарточка2);
					м_Журнал.Окак(`[Twitch 5] Высота карточки=${оСтиль.height} Верх=${оСтиль.top} Низ=${оСтиль.bottom}`);
					let чНиз = Number.parseFloat(оСтиль.bottom);
					if (Number.isNaN(чНиз)) {
						чНиз = Number.parseFloat(getComputedStyle(узКарточка).height) - Number.parseFloat(оСтиль.top) - Number.parseFloat(оСтиль.height);
					}
					if (чНиз < 0) {
						узКарточка2.style.top = Math.floor(Math.max(Number.parseFloat(оСтиль.top) + чНиз, 0)) + 'px';
					}
				}
			}).observe(узКарточка, {
				childList: true,
				subtree: true
			});
		}
	}, false);
}

function УдалитьХвостыСтаройВерсии() {}

function ЗавершитьРаботу() {
	try {
		г_лРаботаЗавершена = true;
		м_Журнал.Окак('[Twitch 5] Завершаю работу');
		ОтменитьЗапрос();
	} catch (_) {}
}

ДобавитьОбработчикИсключений(() => {
	м_Журнал.Окак(`[Twitch 5] content.js запущен по адресу ${location.href}`);
	УдалитьХвостыСтаройВерсии();
	window.addEventListener('unload', ЗавершитьРаботу);
	window.addEventListener(window.PointerEvent ? 'pointerdown' : 'mousedown', ОбработатьPointerDownИClick, true);
	window.addEventListener('click', ОбработатьPointerDownИClick, true);
	window.addEventListener('popstate', ОбработатьPopState);
	м_Настройки.Восстановить().then(() => {
		ИзмененАдресСтраницы('load');
		if (г_оРазобранныйАдрес.чСтраница === РазобратьАдрес.СТРАНИЦА_ЧАТ_КАНАЛА) {
			window.removeEventListener(window.PointerEvent ? 'pointerdown' : 'mousedown', ОбработатьPointerDownИClick, true);
			window.removeEventListener('click', ОбработатьPointerDownИClick, true);
			window.removeEventListener('popstate', ОбработатьPopState);
			if (window !== window.top) {
				ВставитьСторонниеРасширения();
			}
			ИзменитьСтильЧата();
			ИзменитьПоведениеЧата();
		} else {
			window.addEventListener('tw5-pushstate', ОбработатьPushState);
			ВставитьНаСтраницу(ПерехватитьФункции);
			СледитьЗаРазметкойСтраницы();
		}
	}).catch(м_Отладка.ПойманоИсключение);
})();