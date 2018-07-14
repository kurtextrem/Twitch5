'use strict';

function НачатьИздеватьсяНадЧатом(чИдВкладки)
// Функция вынесена в отдельный файл для использования в боковой панели Opera.
{
	if (НачатьИздеватьсяНадЧатом._лОбработчикиУстановлены)
	{
		return;
	}
	НачатьИздеватьсяНадЧатом._лОбработчикиУстановлены = true;
	м_Журнал.Вот(`[Чат] Начинаю издеваться над чатом во вкладке ${чИдВкладки}`);

	// Chrome: Создавать фоновую страницу ради перехвата запросов - это лишний процесс и потеря 20 МБ памяти.
	chrome.webRequest.onHeadersReceived.addListener(
		ДобавитьОбработчикИсключений(оОтвет =>
		{
			if (!( оОтвет.frameId > 0 && оОтвет.parentFrameId === 0 ))
			{
				throw new Error(`Неизвестный источник запроса: ${м_Журнал.O(оОтвет)}`);
			}
			for (let ы = 0; ы < оОтвет.responseHeaders.length; ++ы)
			{
				if (оОтвет.responseHeaders[ы].name.toLowerCase() === 'x-frame-options')
				{
					м_Журнал.Окак(`[Чат] Удаляю заголовок X-Frame-Options из ${оОтвет.url}`);
					оОтвет.responseHeaders.splice(ы, 1);
					return {responseHeaders: оОтвет.responseHeaders};
				}
			}
		}),
		{
			urls:
			[
				'https://www.twitch.tv/popout/*/chat',
				'https://www.twitch.tv/popout/*/chat?*',
				// UNDONE Рейд меняет адрес чата на этот устаревший, добавляя параметр referrer=raid.
				// Далее идет перенаправление на адрес, указанный выше. Удалить устаревший адрес после
				// того, как его перестанет использовать рейд.
				'https://www.twitch.tv/*/chat?*'
			],
			types:
			[
				'sub_frame'
			],
			tabId: чИдВкладки
		},
		[
			'responseHeaders',
			'blocking'
		]
	);

	chrome.runtime.onMessage.addListener(ДобавитьОбработчикИсключений((оСообщение, оОтправитель, фОтветить) =>
	{
		if (!( оСообщение.сЗапрос === 'ВставитьСторонниеРасширения'
		&& (оОтправитель.tab ? оОтправитель.tab.id : chrome.tabs.TAB_ID_NONE) === чИдВкладки ))
		{
			return false;
		}
		м_Журнал.Вот('[Чат] Получен запрос на вставку сторонних расширений');
		chrome.management.getAll(ДобавитьОбработчикИсключений(моРасширения =>
		{
			if (chrome.runtime.lastError)
			{
				throw new Error(`Не удалось получить список расширений: ${chrome.runtime.lastError.message}`);
			}
			оСообщение.сСторонниеРасширения = '';
			for (let оРасширение of моРасширения)
			{
				if (оРасширение.enabled)
				{
					switch (оРасширение.id)
					{
					case 'ajopnjidmegmdimjlfnijceegpefgped': /* BetterTTV Chrome */
					case 'deofbbdfofnmppcjbhjibgodpcdchjii': /* BetterTTV Opera */
						оСообщение.сСторонниеРасширения += 'BTTV ';
						break;
									
					case 'fadndhdgpmmaapbmfcknlfgcflmmmieb': /* FrankerFaceZ Chrome */
					case 'djkpepcignmpfblhbfpmlhoindhndkdj': /* FrankerFaceZ Opera */
						оСообщение.сСторонниеРасширения += 'FFZ ';
						break;
									
					case 'aiimboljphncldaakcnapfolgnjonlea': /* FFZ Add-On Pack Chrome */
						оСообщение.сСторонниеРасширения += 'FFZAP ';
						break;
					}
				}
			}
			м_Журнал.Вот(`[Чат] Посылаю ответ на вставку сторонних расширений: ${оСообщение.сСторонниеРасширения}`);
			try
			{
				// Chrome 66: Кидает исключение если оОтправитель к этому моменту уже закрыт.
				фОтветить(оСообщение);
			}
			catch (пИсключение)
			{
				м_Журнал.Ой(`[Чат] Ошибка при посылке ответа: ${пИсключение}`);
			}
		}));
		return true;
	}));
}
