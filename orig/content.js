'use strict';

const ХРАНИТЬ_СОСТОЯНИЕ_КАНАЛА = 20000; // Миллисекунды.

const ЭТО_НЕ_КОД_КАНАЛА = new Set(
[
	'directory',
	'embed',
	'friends',
	'inventory',
	'login',
	'logout',
	'manager',
	'messages',
	'payments',
	'settings',
	'signup',
	'subscriptions'
]);

let г_оРазобранныйАдрес = null;
let г_сПричинаСменыАдреса = '';

let г_оЗапрос = null;
let г_сКодКанала = '';
//  0 - состояние не получено.
// -1 - после завершения г_оЗапрос не перенаправлять.
// -2 - после завершения г_оЗапрос перенаправить на канал г_сКодКанала.
let г_чПоследняяПроверка = 0;
// Состояние канала.
let г_лИдетТрансляция = false;

const м_Отладка =
{
	ПойманоИсключение(пИсключение)
	{
		if (!г_лРаботаЗавершена)
		{
			console.error(ПеревестиИсключениеВСтроку(пИсключение));
			ЗавершитьРаботу();
		}
		throw undefined;
	},

	ЗавершитьРаботуИПоказатьСообщение(сКодСообщения)
	{
		if (!г_лРаботаЗавершена)
		{
			console.error(сКодСообщения);
			ЗавершитьРаботу();
		}
		throw undefined;
	}
};

function ВставитьНаСтраницу(фВставить)
{
	const узСкрипт = document.createElement('script');
	узСкрипт.textContent =
	`
		'use strict';
		(${фВставить})();
	`;
	(document.head || document.documentElement).appendChild(узСкрипт);
	// Если <head> в этот момент недоступен, то наш <script> нужно сразу удалить, иначе
	// часть <script> (в основном реклама) позже будет вставлена в <html> вместо
	// <head> кодом getElementsByTagName('script')[0].parentNode.appendChild(script).
	// Удаление будет полезно и в других случаях.
	узСкрипт.remove();
}

function ЭтотАдресМожноПеренаправлять(oUrl)
{
	return !oUrl.search.includes(АДРЕС_НЕ_ПЕРЕНАПРАВЛЯТЬ);
}

function ПолучитьНеперенаправляемыйАдрес(oUrl)
{
	return `${oUrl.protocol}//${oUrl.host}${oUrl.pathname}`
		+ (oUrl.search.length > 1 ? `${oUrl.search}&${АДРЕС_НЕ_ПЕРЕНАПРАВЛЯТЬ}` : `?${АДРЕС_НЕ_ПЕРЕНАПРАВЛЯТЬ}`)
		+ oUrl.hash;
}

function ЗапретитьАвтоперенаправлениеЭтойСтраницы()
// Чтобы можно было вернуться на страницу нажав кнопку браузера Назад.
{
	if (ЭтотАдресМожноПеренаправлять(location))
	{
		history.replaceState(history.state, '', ПолучитьНеперенаправляемыйАдрес(location));
	}
}

РазобратьАдрес.СТРАНИЦА_НЕИЗВЕСТНАЯ                = 1;
РазобратьАдрес.СТРАНИЦА_ВОЗМОЖНО_ПРЯМАЯ_ТРАНСЛЯЦИЯ = 2;
РазобратьАдрес.СТРАНИЦА_ЧАТ_КАНАЛА                 = 3;

function РазобратьАдрес(oUrl)
// У Twitch упоротая система адресов. Например /directory - это список игр, /derectory - канал.
// У многих страниц канала исходный код совпадает.
// Сервер Twitch перенаправляет с twitch.tv на www.twitch.tv.
// Сервер Twitch перенаправляет на адрес с первой директорией в нижнем регистре.
// Сервер Twitch иногда переводит параметры в нижний регистр.
{
	let лМобильнаяВерсия = false;
	let чСтраница = РазобратьАдрес.СТРАНИЦА_НЕИЗВЕСТНАЯ;
	let сКодКанала = '';
	let лМожноПеренаправлять = false;
	if (oUrl.protocol === 'https:' && (oUrl.host === 'www.twitch.tv' || oUrl.host === 'm.twitch.tv'))
	{
		лМобильнаяВерсия = oUrl.host === 'm.twitch.tv';
		const мсЧасти = oUrl.pathname.split('/');
		if (мсЧасти.length <= 3 && мсЧасти[1] && !мсЧасти[2])
		{
			// Оптимизация. Не слать напрасно запрос.
			if (!ЭТО_НЕ_КОД_КАНАЛА.has(мсЧасти[1]))
			{
				чСтраница = РазобратьАдрес.СТРАНИЦА_ВОЗМОЖНО_ПРЯМАЯ_ТРАНСЛЯЦИЯ;
				сКодКанала = мсЧасти[1];
				лМожноПеренаправлять = ЭтотАдресМожноПеренаправлять(oUrl);
			}
		}
		// Сервер игнорирует лишние директории справа.
		else if ((мсЧасти[1] === 'embed' || мсЧасти[1] === 'popout') && мсЧасти[2] && мсЧасти[3] === 'chat')
		{
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

function ПолучитьАдресНашегоПроигрывателя(сКодКанала)
{
	return `${chrome.extension.getURL('player.html')}?channel=${сКодКанала}`;
}

function ЗапроситьСостояниеКанала(оРазобранныйАдрес)
{
	// Адрес перенаправлять не нужно?
	if (!оРазобранныйАдрес.лМожноПеренаправлять || !м_Настройки.Получить('лАвтоперенаправлениеРазрешено'))
	{
		return;
	}
	// Ответ уже получен?
	if (!г_оЗапрос && г_сКодКанала === оРазобранныйАдрес.сКодКанала && performance.now() - г_чПоследняяПроверка < ХРАНИТЬ_СОСТОЯНИЕ_КАНАЛА)
	{
		return;
	}
	// Запрос уже отправлен?
	if (г_оЗапрос && г_сКодКанала === оРазобранныйАдрес.сКодКанала)
	{
		return;
	}
	ОтменитьЗапрос();
	г_сКодКанала = оРазобранныйАдрес.сКодКанала;
	г_чПоследняяПроверка = -1;
	ОтправитьЗапрос();
}

function ИзмененАдресСтраницы(сПричина)
{
	г_оРазобранныйАдрес = new РазобратьАдрес(location);
	г_сПричинаСменыАдреса = сПричина;
	// Адрес перенаправлять не нужно?
	if (!г_оРазобранныйАдрес.лМожноПеренаправлять || !м_Настройки.Получить('лАвтоперенаправлениеРазрешено'))
	{
		if (г_чПоследняяПроверка === -2)
		{
			г_чПоследняяПроверка = -1;
		}
		return false;
	}
	// Ответ уже получен?
	if (!г_оЗапрос && г_сКодКанала === г_оРазобранныйАдрес.сКодКанала && performance.now() - г_чПоследняяПроверка < ХРАНИТЬ_СОСТОЯНИЕ_КАНАЛА)
	{
		if (г_лИдетТрансляция)
		{
			ПеренаправитьНаНашПроигрыватель(г_сКодКанала);
			return true;
		}
		return false;
	}
	// Запрос уже отправлен?
	if (г_оЗапрос && г_сКодКанала === г_оРазобранныйАдрес.сКодКанала)
	{
		г_чПоследняяПроверка = -2;
		return false;
	}
	ОтменитьЗапрос();
	г_сКодКанала = г_оРазобранныйАдрес.сКодКанала;
	г_чПоследняяПроверка = -2;
	ОтправитьЗапрос();
	return false;
}

function ОтменитьЗапрос()
{
	if (г_оЗапрос)
	{
		м_Журнал.Окак('[Twitch 5] Отменяю незавершенный запрос');
		// Синхронно вызывает обработчик события loadend, который изменяет состояние канала.
		г_оЗапрос.abort();
	}
}

function ОтправитьЗапрос()
{
	const сАдресЗапроса = `https://api.twitch.tv/kraken/streams/${г_сКодКанала}`;
	м_Журнал.Окак(`[Twitch 5] Посылаю запрос ${сАдресЗапроса}`);
	г_оЗапрос = new XMLHttpRequest();
	г_оЗапрос.addEventListener('loadend', ОбработатьОтвет);
	г_оЗапрос.open('GET', сАдресЗапроса);
	г_оЗапрос.responseType = 'text';
	г_оЗапрос.timeout = 10000;
	г_оЗапрос.setRequestHeader('Client-ID', 'jzkbprff40iqj646a697cyrvl0zt2m6');
	// Версия 3, чтобы не делать лишнего запроса на получение идентификатора канала.
	г_оЗапрос.setRequestHeader('Accept', 'application/vnd.twitchtv.v3+json');
	г_оЗапрос.send();
}

function ОбработатьОтвет()
{
	м_Журнал.Окак(`[Twitch 5] Получен ответ Код=${this.status}\n${this.response}`);
	г_оЗапрос = null;
	// Вызван abort(), проблемы на сервере, неправильно составлен запрос, указанного канала не существует...
	if (this.status !== 200 || !this.response)
	{
		г_чПоследняяПроверка = 0;
		return;
	}
	const лПеренаправить = г_чПоследняяПроверка === -2;
	г_чПоследняяПроверка = performance.now();
	г_лИдетТрансляция = false;
	try
	{
		г_лИдетТрансляция = typeof JSON.parse(this.response).stream._id === 'number';
	}
	catch (и)
	{
		// Вместо JSON прислали фигню, трансляция завершена, указанного канала не существует...
	}
	if (лПеренаправить && г_лИдетТрансляция)
	{
		ПеренаправитьНаНашПроигрыватель(г_сКодКанала);
	}
}

function ЗапуститьНашПроигрыватель(сКодКанала)
{
	const сАдресПроигрывателя = ПолучитьАдресНашегоПроигрывателя(сКодКанала);
	м_Журнал.Окак(`[Twitch 5] Перехожу на страницу ${сАдресПроигрывателя}`);
	ЗапретитьАвтоперенаправлениеЭтойСтраницы();
	location.assign(сАдресПроигрывателя);
}

function ПеренаправитьНаНашПроигрыватель(сКодКанала)
{
	const сАдресПроигрывателя = ПолучитьАдресНашегоПроигрывателя(сКодКанала);
	м_Журнал.Окак(`[Twitch 5] Меняю адрес страницы с ${location.href} на ${сАдресПроигрывателя}`);
	document.documentElement.setAttribute('data-tw5-перенаправление', '');
	//
	// HACK Opera 52: location.replace(chrome-extension://) не замещает, а добавляет адрес в историю.
	//
	if (!navigator.userAgent.includes('OPR/'))
	{
		location.replace(сАдресПроигрывателя);
	}
	else
	{
		if (г_сПричинаСменыАдреса === 'pushstate')
		{
			// Синхронно вызывает обработчик события popstate.
			history.back();
		}
		else
		{
			ЗапретитьАвтоперенаправлениеЭтойСтраницы();
		}
		location.assign(сАдресПроигрывателя);
	}
}

function ОбработатьPointerDownИClick(оСобытие)
// У адреса ссылки и адреса страницы могут отличаться pathname и search. Например:
// https://www.twitch.tv/channel/videos?tt_medium=twitch_topnav&tt_content=tab_videos
// https://www.twitch.tv/channel/videos/all
{
	// Настройки восстановлены?
	if (г_оРазобранныйАдрес)
	{
		const узСсылка = оСобытие.target.closest('a[href]');
		// Ссылка откроется в той же вкладке?
		if (узСсылка
		&&  оСобытие.isPrimary !== false // true для pointerdown, undefined для mousedown и click.
		&&  оСобытие.button === ЛЕВАЯ_КНОПКА
		&& !оСобытие.shiftKey && !оСобытие.ctrlKey && !оСобытие.altKey && !оСобытие.metaKey)
		{
			м_Журнал.Окак(`[Twitch 5] Произошло событие ${оСобытие.type} у ссылки ${узСсылка.href}`);
			ЗапроситьСостояниеКанала(new РазобратьАдрес(узСсылка));
		}
	}
}

function ОбработатьPopState(оСобытие)
// В истории неперенаправленные адреса могут появиться если:
// - Расширение было отключено.
// - Автоперенаправление было отключено.
// - Был сделан переход на другую страницу до получения ответа.
{
	// Настройки восстановлены?
	if (г_оРазобранныйАдрес)
	{
		м_Журнал.Окак(`[Twitch 5] Произошло событие popstate ${location.href}`);
		// Между сменой адреса и сменой заголовка страницы может пройти несколько секунд. Если перенаправить до смены
		// заголовка, то в истории браузера и в истории вкладки останется неправильный заголовок предыдущей страницы.
		// Chrome: popstate восстанавливает заголовок страницы из истории. Не знаю с какой версии.
		if (ВЕРСИЯ_ДВИЖКА_БРАУЗЕРА < 67)
		{
			document.title = 'Twitch';
		}
		// Вызван history.back() в ПеренаправитьНаНашПроигрыватель()?
		if (document.documentElement.hasAttribute('data-tw5-перенаправление') || ИзмененАдресСтраницы('popstate'))
		{
			м_Журнал.Окак('[Twitch 5] Скрываю событие popstate');
			оСобытие.stopImmediatePropagation();
			оСобытие.stopPropagation();
		}
	}
}

function ОбработатьPushState(оСобытие)
{
	м_Журнал.Окак(`[Twitch 5] Произошло событие tw5-pushstate ${location.href}`);
	ИзмененАдресСтраницы('pushstate');
}

function ОбработатьЗапускНашегоПроигрывателя(оСобытие)
{
	оСобытие.preventDefault();
	if (оСобытие.button === ЛЕВАЯ_КНОПКА && г_оРазобранныйАдрес.чСтраница === РазобратьАдрес.СТРАНИЦА_ВОЗМОЖНО_ПРЯМАЯ_ТРАНСЛЯЦИЯ)
	{
		ЗапуститьНашПроигрыватель(г_оРазобранныйАдрес.сКодКанала);
	}
	else
	{
		м_Журнал.Окак(`[Twitch 5] Не запускать проигрыватель Кнопка=${оСобытие.button} Страница=${г_оРазобранныйАдрес.чСтраница}`);
	}
}

function ОбработатьПереключениеАвтоперенаправления(оСобытие)
{
	оСобытие.preventDefault();
	const л = !м_Настройки.Получить('лАвтоперенаправлениеРазрешено');
	м_Журнал.Окак(`[Twitch 5] Автоперенаправление разрешено: ${л}`);
	м_Настройки.Изменить('лАвтоперенаправлениеРазрешено', л);
	ОбновитьНашуКнопку();
}

function ОбработатьЗакрытиеСправки(оСобытие)
{
	оСобытие.preventDefault();
	м_Журнал.Окак('[Twitch 5] Закрываю справку');
	оСобытие.currentTarget.classList.remove('tw5-справка');
	оСобытие.currentTarget.removeEventListener('mouseover', ОбработатьЗакрытиеСправки);
	оСобытие.currentTarget.removeEventListener('touchstart', ОбработатьЗакрытиеСправки);
	м_Настройки.Изменить('лАвтоперенаправлениеЗамечено', true);
}

function ПолучитьНашуКнопку()
{
	return document.getElementById('tw5-автоперенаправление');
}

function ОбновитьНашуКнопку()
{
	ПолучитьНашуКнопку().classList.toggle('tw5-запрещено', !м_Настройки.Получить('лАвтоперенаправлениеРазрешено'));
}

function ВставитьНашуКнопку()
{
	if (!г_оРазобранныйАдрес.лМобильнаяВерсия)
	{
		const сузКудаВставлять = document.getElementsByClassName('top-nav__menu');
		if (сузКудаВставлять.length === 0)
		{
			return false;
		}
		м_Журнал.Окак('[Twitch 5] Вставляю нашу кнопку');
		сузКудаВставлять[0].lastElementChild.insertAdjacentHTML('beforebegin',
		`
		<div class="tw5-автоперенаправление tw5-js-удалить tw-align-self-center tw-flex-grow-0 tw-flex-shrink-0 tw-flex-nowrap tw-pd-l-05 tw-pd-r-1">
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
	}
	else
	{
		const сузКудаВставлять = document.getElementsByClassName('mw-top-nav__menu');
		if (сузКудаВставлять.length === 0)
		{
			return false;
		}
		м_Журнал.Окак('[Twitch 5] Вставляю нашу кнопку для мобильного сайта');
		сузКудаВставлять[0].insertAdjacentHTML('beforebegin',
		`
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

	if (!г_оРазобранныйАдрес.лМобильнаяВерсия && !м_Настройки.Получить('лАвтоперенаправлениеЗамечено'))
	{
		узКнопка.parentNode.classList.add('tw5-справка');
		узКнопка.parentNode.addEventListener('mouseover', ОбработатьЗакрытиеСправки);
		// Касание tooltip-а должно его закрыть (для этого :hover не должен быть активен), и событие
		// click не должно быть послано элементу, который находится под закрытым tooltip.
		узКнопка.parentNode.addEventListener('touchstart', ОбработатьЗакрытиеСправки, {passive: false});
	}

	ОбновитьНашуКнопку();
	return true;
}

function СледитьЗаРазметкойСтраницы()
{
	if (ВставитьНашуКнопку() && !г_оРазобранныйАдрес.лМобильнаяВерсия)
	{
		return;
	}
	(new MutationObserver((моЗаписи, оНаблюдатель) =>
	{
		if (!ПолучитьНашуКнопку() && ВставитьНашуКнопку() && !г_оРазобранныйАдрес.лМобильнаяВерсия)
		{
			оНаблюдатель.disconnect();
		}
	}))
	.observe(
		document.documentElement,
		{
			childList: true,
			subtree: true
		}
	);
}

function ПерехватитьФункции()
{
	let _лНеПерехватывать = false;


	window.addEventListener('tw5-неперехватывать', () =>
	// Нельзя восстанавливать перехваченные функции, потому что их уже могли перехватить другие скрипты.
	{
		_лНеПерехватывать = true;
	});

	// Уведомляет об изменении адреса страницы. Также запрещает менять адрес во время перенаправления.
	// Twitch не использует replaceState().
	const fPushState = history.pushState;
	history.pushState = function(state, title)
	{
		if (_лНеПерехватывать)
		{
			return fPushState.apply(this, arguments);
		}
		if (!document.documentElement.hasAttribute('data-tw5-перенаправление'))
		{
			const сБыло = location.pathname;
			fPushState.apply(this, arguments);
			if (сБыло !== location.pathname)
			{
				document.title = 'Twitch';
				window.dispatchEvent(new CustomEvent('tw5-pushstate'));
			}
		}
	};

	// Запрещает менять заголовок страницы во время перенаправления.
	const oTitleDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
	Object.defineProperty(document, 'title',
	{
		configurable: oTitleDescriptor.configurable,
		enumerable: oTitleDescriptor.enumerable,
		get()
		{
			return oTitleDescriptor.get.apply(this, arguments);
		},
		set(title)
		{
			if (_лНеПерехватывать)
			{
				return oTitleDescriptor.set.apply(this, arguments);
			}
			if (!this.documentElement.hasAttribute('data-tw5-перенаправление'))
			{
				oTitleDescriptor.set.apply(this, arguments);
			}
		}
	});
}


function ЖдатьЗагрузкуДомика()
{
	return new Promise((фВыполнить, фОтказаться) =>
	{
		м_Журнал.Окак(`[Twitch 5] document.readyState=${document.readyState}`);
		if (document.readyState !== 'loading')
		{
			фВыполнить();
		}
		else
		{
			document.addEventListener('DOMContentLoaded', function ОбработатьЗагрузкуДомика()
			{
				try
				{
					м_Журнал.Окак(`[Twitch 5] document.readyState=${document.readyState}`);
					document.removeEventListener('DOMContentLoaded', ОбработатьЗагрузкуДомика);
					фВыполнить();
				}
				catch (пИсключение)
				{
					фОтказаться(пИсключение);
				}
			});
		}
	});
}

function ВставитьСторонниеРасширения()
{
	chrome.runtime.sendMessage(
		{
			сЗапрос: 'ВставитьСторонниеРасширения'
		},
		оСообщение =>
		{
			if (chrome.runtime.lastError)
			{
				м_Журнал.Окак(`[Twitch 5] Не удалось послать запрос на вставку сторонних расширений: ${chrome.runtime.lastError.message}`);
				return;
			}
			if (оСообщение.сСторонниеРасширения === '')
			{
				return;
			}
			ЖдатьЗагрузкуДомика().then(() =>
			{
				м_Журнал.Окак(`[Twitch 5] Вставляю сторонние расширения: ${оСообщение.сСторонниеРасширения}`);
				if (оСообщение.сСторонниеРасширения.includes('BTTV '))
				{
					const узСкрипт = document.createElement('script');
					узСкрипт.src = 'https://cdn.betterttv.net/betterttv.js';
					document.head.appendChild(узСкрипт);
				}
				if (оСообщение.сСторонниеРасширения.includes('FFZ '))
				{
					const узСкрипт = document.createElement('script');
					узСкрипт.src = 'https://cdn.frankerfacez.com/script/script.min.js';
					document.head.appendChild(узСкрипт);
				}
				if (оСообщение.сСторонниеРасширения.includes('FFZAP '))
				{
					const узСкрипт = document.createElement('script');
					узСкрипт.src = 'https://cdn.ffzap.com/ffz-ap.min.js';
					document.head.appendChild(узСкрипт);
				}
			});
		}
	);
}


function ИзменитьСтильЧата()
{
	const узСтиль = document.createElement('link');
	узСтиль.rel = 'stylesheet';
	узСтиль.href = chrome.extension.getURL('content.css');
	узСтиль.className = 'tw5-js-удалить';
	(document.head || document.documentElement).appendChild(узСтиль);
}

function ИзменитьПоведениеЧата()
{
	// Открывать ссылки в новой вкладке, а не во фрейме чата.
	if (window !== window.top)
	{
		window.addEventListener(
			'click',
			оСобытие =>
			{
				if (оСобытие.button !== ЛЕВАЯ_КНОПКА)
				{
					return;
				}
				const узСсылка = оСобытие.target.closest('a[href^="http:"],a[href^="https:"],a[href]:not([href=""]):not([href^="#"]):not([href*=":"])');
				if (!узСсылка)
				{
					return;
				}
				м_Журнал.Окак(`[Twitch 5] Открываю ссылку в новой вкладке: ${узСсылка.getAttribute('href')}`);
				узСсылка.target = '_blank';
				// В настройках чата ссылки Manage Raid Settings и Manage Moderation Settings непонятно зачем
				// вызывают preventDefault() и самостоятельно меняют адрес текущей вкладки, игнорируя target.
				оСобытие.stopImmediatePropagation();
				оСобытие.stopPropagation();
			},
			true
		);
	}

	// После работы ИзменитьСтильЧата(), карточка зрителя может выйти за нижнюю границу экрана.
	// Код страницы меняет положение карточки в обработчике события click, во время поднятия события
	// через document. Вызываем наш обработчик еще позже, во время поднятия через window.
	window.addEventListener(
		'click',
		function ОбработатьОткрытиеКарточки()
		{
			const узКарточка = document.getElementsByClassName('viewer-card-layer')[0];
			if (узКарточка)
			{
				window.removeEventListener('click', ОбработатьОткрытиеКарточки, false);
				(new MutationObserver(() =>
				{
					const узКарточка2 = узКарточка.firstElementChild;
					// Карточка открыта?
					if (узКарточка2)
					{
						const оСтиль = getComputedStyle(узКарточка2);
						м_Журнал.Окак(`[Twitch 5] Высота карточки=${оСтиль.height} Верх=${оСтиль.top} Низ=${оСтиль.bottom}`);
						let чНиз = Number.parseFloat(оСтиль.bottom);
						// Edge 16, Chrome 49: bottom равен auto вместо px.
						if (Number.isNaN(чНиз))
						{
							чНиз = Number.parseFloat(getComputedStyle(узКарточка).height) - Number.parseFloat(оСтиль.top) - Number.parseFloat(оСтиль.height);
						}
						if (чНиз < 0)
						{
							узКарточка2.style.top = Math.floor(Math.max(Number.parseFloat(оСтиль.top) + чНиз, 0)) + 'px';
						}
					}
				}))
				.observe(узКарточка,
				{
					childList: true,
					subtree: true
				});
			}
		},
		false
	);
}

function УдалитьХвостыСтаройВерсии()
{
}

function ЗавершитьРаботу()
// В момент вызова настройки могут быть еще не восстановлены.
{
	try
	{
		г_лРаботаЗавершена = true;
		м_Журнал.Окак('[Twitch 5] Завершаю работу');
		м_Настройки.Остановить();
		ОтменитьЗапрос();
		м_Журнал.Окак('[Twitch 5] Работа завершена');
	}
	catch (_) {}
}

ДобавитьОбработчикИсключений(() =>
{
	м_Журнал.Окак(`[Twitch 5] content.js запущен по адресу ${location.href}`);
	УдалитьХвостыСтаройВерсии();
	window.addEventListener('beforeunload', ЗавершитьРаботу);
	// HACK Firefox 61 Android: Настройки приходят после загрузки страницы, когда перехватывать события уже поздно.
	// window и capture нужны, чтобы послать запрос как можно быстрее, до выполнения медленного кода страницы.
	// Шлем запрос заранее, до отпускания кнопки указателя, чтобы сэкономить до 200 мс.
	window.addEventListener(window.PointerEvent ? 'pointerdown' : 'mousedown', ОбработатьPointerDownИClick, true);
	window.addEventListener('click', ОбработатьPointerDownИClick, true);
	window.addEventListener('popstate', ОбработатьPopState);
	м_Настройки.Восстановить()
	.then(() =>
	{
		ИзмененАдресСтраницы('load');
		if (г_оРазобранныйАдрес.чСтраница === РазобратьАдрес.СТРАНИЦА_ЧАТ_КАНАЛА)
		{
			window.removeEventListener(window.PointerEvent ? 'pointerdown' : 'mousedown', ОбработатьPointerDownИClick, true);
			window.removeEventListener('click', ОбработатьPointerDownИClick, true);
			window.removeEventListener('popstate', ОбработатьPopState);
			if (window !== window.top)
			{
				ВставитьСторонниеРасширения();
			}
			ИзменитьСтильЧата();
			ИзменитьПоведениеЧата();
		}
		else
		{
			window.addEventListener('tw5-pushstate', ОбработатьPushState);
			ВставитьНаСтраницу(ПерехватитьФункции);
			СледитьЗаРазметкойСтраницы();
		}
	})
	.catch(м_Отладка.ПойманоИсключение);
})();
