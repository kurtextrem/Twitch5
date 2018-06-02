'use strict';

/* Chrome 48-, Edge 15
if (!window.URLSearchParams)
{
	window.URLSearchParams = function(сПараметры)
	{
		Проверить(arguments.length === 1 && typeof сПараметры === 'string');
		this._амПараметры = new Map();
		if (сПараметры.length !== 0)
		{
			for (let сПараметр of сПараметры.split('&'))
			{
				const чРавно = сПараметр.indexOf('=');
				if (чРавно === -1)
				{
					const сИмя = decodeURIComponent(сПараметр);
					if (!this._амПараметры.has(сИмя))
					{
						this._амПараметры.set(сИмя, '');
					}
				}
				else
				{
					let сИмя = decodeURIComponent(сПараметр.slice(0, чРавно));
					if (!this._амПараметры.has(сИмя))
					{
						this._амПараметры.set(сИмя, decodeURIComponent(сПараметр.slice(чРавно + 1)));
					}
				}
			}
		}
	};

	window.URLSearchParams.prototype.has = function(сИмя)
	{
		return this._амПараметры.has(String(сИмя));
	};

	window.URLSearchParams.prototype.get = function(сИмя)
	{
		const сЗначение = this._амПараметры.get(String(сИмя));
		return сЗначение === undefined ? null : сЗначение;
	};
}*/

// Chrome 59, Firefox 54
if (!window.setImmediate)
// Для моих целей пока достаточно setTimeout().
{
	window.setImmediate = фВызвать =>
	{
		Проверить(typeof фВызвать === 'function');
		setTimeout(фВызвать, 0);
	};
}

/* Chrome 50-
if (!NodeList.prototype[Symbol.iterator])
{
	NodeList.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}
if (!HTMLCollection.prototype[Symbol.iterator])
{
	HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}*/

const ЗАГЛУШКА = () => {};

function Проверить(пУсловие)
{
	if (!пУсловие)
	{
		throw new Error('Проверка не пройдена');
	}
}

function Тип(пЗначение)
{
	return пЗначение === null ? 'null' : typeof пЗначение;
}

function ЭтоНепустаяСтрока(пЗначение)
{
	return typeof пЗначение === 'string' && пЗначение !== '';
}

function ОграничитьДлинуСтроки(сСтрока, чМаксимальнаяДлина)
// Возвращаемая строка может быть на несколько символов длиннее чМаксимальнаяДлина.
{
	return сСтрока.length <= чМаксимальнаяДлина ? сСтрока : `${сСтрока.slice(0, чМаксимальнаяДлина)}---8<---Отрезано ${сСтрока.length - чМаксимальнаяДлина}`;
}

function ДобавитьОбработчикИсключений(фФункция)
{
	return function()
	{
		try
		{
			return фФункция.apply(this, arguments);
		}
		catch (пИсключение)
		{
			м_Отладка.ПойманоИсключение(пИсключение);
		}
	};
}

const м_Журнал = (() =>
{
	const КОЛИЧЕСТВО_ЗАПИСЕЙ_В_ЖУРНАЛЕ = 1500;
	const МАКС_ДЛИНА_ЗАПИСИ            = 1000;

	let _мсЖурнал = null; // Кольцевой буфер.
	let _чПоследняяЗапись = -1;

	function Добавить(сВажность, сЗапись)
	{
		if (_мсЖурнал)
		{
			Проверить(typeof сВажность === 'string' && typeof сЗапись === 'string');
			сЗапись = ОграничитьДлинуСтроки(`${сВажность} ${(performance.now() / 1000).toFixed(3)} ${сЗапись}`, МАКС_ДЛИНА_ЗАПИСИ);
			if (++_чПоследняяЗапись === _мсЖурнал.length)
			{
				_чПоследняяЗапись = 0;
			}
			_мсЖурнал[_чПоследняяЗапись] = сЗапись;
		}
	}

	function ПолучитьДанныеДляОтчета()
	{
		if (!_мсЖурнал)
		{
			return null;
		}
		const чСледующаяЗапись = _чПоследняяЗапись + 1;
		if (чСледующаяЗапись === _мсЖурнал.length)
		{
			return _мсЖурнал;
		}
		if (_мсЖурнал[чСледующаяЗапись] === undefined)
		{
			return _мсЖурнал.slice(0, чСледующаяЗапись);
		}
		return _мсЖурнал.slice(чСледующаяЗапись).concat(_мсЖурнал.slice(0, чСледующаяЗапись));
	}

	function Вот(сЗапись)
	{
		Проверить(arguments.length === 1);
		Добавить(' ', сЗапись);
	}

	function Окак(сЗапись)
	{
		Проверить(arguments.length === 1);
		Добавить('~', сЗапись);
	}

	function Ой(сЗапись)
	{
		Проверить(arguments.length === 1);
		Добавить('@', сЗапись);
	}

	function O(пОбъект)
	{
		switch (Тип(пОбъект))
		{
			case 'object':   return JSON.stringify(пОбъект);
			case 'function': return `[function ${пОбъект.name}]`;
			case 'symbol':   return '[symbol]';
			default:         return String(пОбъект);
		}
	}

	function F(чТочность)
	{
		return чЗначение => typeof чЗначение === 'number' ? чЗначение.toFixed(чТочность) : 'NaN';
	}

	if (document.currentScript.hasAttribute('data-журнал'))
	{
		_мсЖурнал = new Array(КОЛИЧЕСТВО_ЗАПИСЕЙ_В_ЖУРНАЛЕ);
		Вот(`[Журнал] Журнал запущен ${performance.now().toFixed()}мс`);
	}

	return {
		Вот, Окак, Ой,
		O, F0: F(0), F1: F(1), F2: F(2), F3: F(3),
		ПолучитьДанныеДляОтчета
	};
})();

const м_i18n = (() =>
{
	function GetMessage(sMessageName, sSubstitution)
	{
		Проверить(ЭтоНепустаяСтрока(sMessageName));
		Проверить(sSubstitution === undefined || typeof sSubstitution === 'string');
		const sMessageText = chrome.i18n.getMessage(sMessageName, sSubstitution);
		if (!sMessageText)
		{
			throw new Error(`Не найден текст ${sMessageName}`);
		}
		return sMessageText;
	}

	function InsertAdjacentHtmlMessage(elInsertTo, sPosition, sMessageName)
	{
		// Commentary for AMO reviewers: HTML content is taken from the file messages.json. See GetMessage().
		elInsertTo.insertAdjacentHTML(sPosition, GetMessage(sMessageName));
	}

	function TranslateDocument(оДокумент)
	{
		м_Журнал.Вот('[i18n] Перевод документа');
		// Chrome 50-: Итераторы я добавил только для текущего контекста, поэтому for...of использовать нельзя.
		for (let celTranslate = оДокумент.querySelectorAll('*[data-i18n]'), i = 0, elTranslate; elTranslate = celTranslate[i]; ++i)
		{
			const sNames = elTranslate.getAttribute('data-i18n');
			const sNamesDelimiter = sNames.indexOf('^');
			if (sNamesDelimiter !== 0)
			{
				InsertAdjacentHtmlMessage(elTranslate, 'beforeend', sNamesDelimiter === -1 ? sNames : sNames.slice(0, sNamesDelimiter));
			}
			if (sNamesDelimiter !== -1)
			{
				elTranslate.title = GetMessage(sNames.slice(sNamesDelimiter + 1));
			}
		}
	}

	function ФорматироватьЧисло(пЧисло, кДробныхРазрядов /* необязательный */)
	// TODO Кэшировать Intl.NumberFormat для каждого кДробныхРазрядов.
	{
		Проверить(кДробныхРазрядов === undefined || (typeof кДробныхРазрядов === 'number' && кДробныхРазрядов >= 0));
		return Number(пЧисло).toLocaleString(undefined, кДробныхРазрядов === undefined ? undefined : {minimumFractionDigits: кДробныхРазрядов});
	}

	function ПеревестиСекундыВСтроку(кСекунды, лНужныСекунды)
	{
		let ч = Math.floor(кСекунды / 60 % 60);
		let с = Math.floor(кСекунды / 60 / 60) + (ч < 10 ? ' : 0' : ' : ') + ч;
		if (лНужныСекунды)
		{
			ч = Math.floor(кСекунды % 60);
			с += (ч < 10 ? ' : 0' : ' : ') + ч;
		}
		return с;
	}

	function ПрошлоДнейПрописью(дСДаты)
	{
		if (ПрошлоДнейПрописью.мсДни === undefined)
		{
			ПрошлоДнейПрописью.мсДни = GetMessage('J0132').split('^');
			Проверить(ПрошлоДнейПрописью.мсДни.length > 1);
		}
		const чПрошлоДней = Math.floor((Date.now() - дСДаты.getTime()) / (1000 * 60 * 60 * 24));
		return чПрошлоДней >= 0 && чПрошлоДней < ПрошлоДнейПрописью.мсДни.length ? ПрошлоДнейПрописью.мсДни[чПрошлоДней] : '';
	}

	return {
		GetMessage,
		InsertAdjacentHtmlMessage,
		TranslateDocument,
		ФорматироватьЧисло,
		ПеревестиСекундыВСтроку,
		ПрошлоДнейПрописью
	};
})();
