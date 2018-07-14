'use strict';

const м_Отладка =
{
	ПойманоИсключение(пИсключение)
	{
		г_лРаботаЗавершена = true;
		throw пИсключение;
	}
};

if (location.hash.length < 2)
{
	м_i18n.TranslateDocument(document);
}
else
{
	// Opera 52: Боковая панель не является вкладкой. Можно фильтровать запросы по TAB_ID_NONE,
	// нельзя фильтровать по идентификатору окна. В режиме incognito нет свойства initiator.
	// TODO У onHeadersReceived и onMessage всегда есть url. Можно проверять источник запроса,
	// добавив в адрес случайный параметр.
	НачатьИздеватьсяНадЧатом(chrome.tabs.TAB_ID_NONE);
	// Operа позволяет загружать в боковую панель только страницы расширения.
	// В Firefox нет такого ограничения.
	document.getElementById('чат').src = decodeURIComponent(location.hash.slice(1));
}
