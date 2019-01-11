'use strict';

(() =>
{
	let _лЗадерживатьСообщенияМыши = false;
	let _чИдОсновногоУказателя = NaN;

	const _оСвойства =
	{
		pointerId:          0,
		width:              1,
		height:             1,
		pressure:           0,
		tangentialPressure: 0,
		tiltX:              0,
		tiltY:              0,
		twist:              0,
		pointerType:       '',
		isPrimary:      false
	};

	class PointerEvent extends MouseEvent
	{
		constructor(сТипСобытия, оПараметры = {})
		{
			super(сТипСобытия, оПараметры);
			const оОпределениеСвойства =
			{
				enumerable: true,
				configurable: true
			};
			for (let сИмя of Object.keys(_оСвойства))
			{
				if (сИмя in оПараметры)
				{
					if (typeof оПараметры[сИмя] !== typeof _оСвойства[сИмя] || Number.isNaN(оПараметры[сИмя]))
					{
						throw new TypeError(`В конструктор PointerEvent передан параметр ${сИмя} недопустимого типа`);
					}
					оОпределениеСвойства.value = оПараметры[сИмя];
				}
				else
				{
					оОпределениеСвойства.value = _оСвойства[сИмя];
				}
				Object.defineProperty(this, сИмя, оОпределениеСвойства);
			}
		}
	}

	function СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, сТипСобытия, button)
	{
		const оПараметры = {};
		// EventInit
		оПараметры.bubbles            = оСобытиеМыши.bubbles;
		оПараметры.cancelable         = оСобытиеМыши.cancelable;
		оПараметры.composed           = true;
		// UIEventInit
		оПараметры.view               = оСобытиеМыши.view;
		// EventModifierInit
		оПараметры.ctrlKey            = оСобытиеМыши.ctrlKey;
		оПараметры.shiftKey           = оСобытиеМыши.shiftKey;
		оПараметры.altKey             = оСобытиеМыши.altKey;
		оПараметры.metaKey            = оСобытиеМыши.metaKey;
		оПараметры.modifierAltGraph   = оСобытиеМыши.getModifierState('AltGraph');
		оПараметры.modifierCapsLock   = оСобытиеМыши.getModifierState('CapsLock');
		оПараметры.modifierNumLock    = оСобытиеМыши.getModifierState('NumLock');
		оПараметры.modifierScrollLock = оСобытиеМыши.getModifierState('ScrollLock');
		// MouseEventInit
		оПараметры.screenX            = оСобытиеМыши.screenX;
		оПараметры.screenY            = оСобытиеМыши.screenY;
		оПараметры.clientX            = оСобытиеМыши.clientX;
		оПараметры.clientY            = оСобытиеМыши.clientY;
		оПараметры.button             = button;
		оПараметры.buttons            = оСобытиеМыши.buttons;
		оПараметры.relatedTarget      = оСобытиеМыши.relatedTarget;
		// PointerEventInit
		оПараметры.pressure           = оПараметры.buttons === 0 ? 0 : 0.5;
		оПараметры.pointerType        = 'mouse';
		оПараметры.isPrimary          = true;
		const оСобытиеУказателя = new PointerEvent(сТипСобытия, оПараметры);
		// Firefox 52: У созданного события значение timeStamp в микросекундах.
		// В любом браузере для повышения точности следует копировать исходный timeStamp.
		Object.defineProperty(оСобытиеУказателя, 'timeStamp',
		{
			enumerable: true,
			configurable: true,
			value: оСобытиеМыши.timeStamp
		});
		const лОтменено = !оСобытиеМыши.target.dispatchEvent(оСобытиеУказателя);
		// Событие изначально должно иметь defaultPrevented == false.
		// TODO Добавить перехват события в самый конец bubble phase и там его отменять.
		// На данный момент расширению это не нужно.
		if (лОтменено)
		{
			оСобытиеМыши.preventDefault();
		}
		return лОтменено;
	}
	
	const ОбработатьMouseDown = ДобавитьОбработчикИсключений(оСобытиеМыши =>
	{
		if ((оСобытиеМыши.buttons & (оСобытиеМыши.buttons - 1)) === 0)
		{
			_лЗадерживатьСообщенияМыши = СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointerdown', оСобытиеМыши.button);
		}
		else
		{
			СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointermove', оСобытиеМыши.button);
		}
		if (_лЗадерживатьСообщенияМыши)
		{
			оСобытиеМыши.stopImmediatePropagation();
			оСобытиеМыши.stopPropagation();
		}
	});
	
	const ОбработатьMouseMove = ДобавитьОбработчикИсключений(оСобытиеМыши =>
	{
		СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointermove', -1);
		if (_лЗадерживатьСообщенияМыши)
		{
			оСобытиеМыши.stopImmediatePropagation();
			оСобытиеМыши.stopPropagation();
		}
	});
	
	const ОбработатьMouseUp = ДобавитьОбработчикИсключений(оСобытиеМыши =>
	{
		if (оСобытиеМыши.buttons === 0)
		{
			СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointerup', оСобытиеМыши.button);
		}
		else
		{
			СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointermove', оСобытиеМыши.button);
		}
		if (_лЗадерживатьСообщенияМыши)
		{
			оСобытиеМыши.stopImmediatePropagation();
			оСобытиеМыши.stopPropagation();
		}
		if (оСобытиеМыши.buttons === 0)
		{
			_лЗадерживатьСообщенияМыши = false;
		}
	});
	
	const ОбработатьMouseOver = ДобавитьОбработчикИсключений(оСобытиеМыши =>
	{
		СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointerover', -1);
	});
	
	const ОбработатьMouseOut = ДобавитьОбработчикИсключений(оСобытиеМыши =>
	{
		СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointerout', -1);
	});


	function СоздатьИПослатьСобытиеУказателяДляКасания(оСобытиеКасания, оКасание, сТипСобытия, bubbles, cancelable, button, buttons, target = оКасание.target)
	{
		const оПараметры = {};
		// EventInit
		оПараметры.bubbles     = bubbles;
		оПараметры.cancelable  = cancelable;
		оПараметры.composed    = true;
		// UIEventInit
		оПараметры.view        = оСобытиеКасания.view;
		// EventModifierInit
		оПараметры.ctrlKey     = оСобытиеКасания.ctrlKey;
		оПараметры.shiftKey    = оСобытиеКасания.shiftKey;
		оПараметры.altKey      = оСобытиеКасания.altKey;
		оПараметры.metaKey     = оСобытиеКасания.metaKey;
		// MouseEventInit
		оПараметры.screenX     = оКасание.screenX;
		оПараметры.screenY     = оКасание.screenY;
		оПараметры.clientX     = оКасание.clientX;
		оПараметры.clientY     = оКасание.clientY;
		оПараметры.button      = button;
		оПараметры.buttons     = buttons;
		// PointerEventInit
		оПараметры.pointerId   = оКасание.identifier;
		оПараметры.width       = оКасание.radiusX * 2;
		оПараметры.height      = оКасание.radiusY * 2;
		оПараметры.pressure    = оКасание.force;
		оПараметры.pointerType = 'touch';
		оПараметры.isPrimary   = оКасание.identifier === _чИдОсновногоУказателя;
		const оСобытиеУказателя = new PointerEvent(сТипСобытия, оПараметры);
		Object.defineProperty(оСобытиеУказателя, 'timeStamp',
		{
			enumerable: true,
			configurable: true,
			value: оСобытиеКасания.timeStamp
		});
		target.dispatchEvent(оСобытиеУказателя);
	}

	function ДляКаждогоИзмененногоКасания(оСобытиеКасания, фВызвать)
	{
		for (let ы = 0; ы < оСобытиеКасания.changedTouches.length; ++ы)
		{
			const оКасание = оСобытиеКасания.changedTouches.item(ы);
			if (оКасание.target === оСобытиеКасания.target)
			{
				фВызвать(оКасание);
			}
		}
	}
	
	const ОбработатьTouchStart = ДобавитьОбработчикИсключений(оСобытиеКасания =>
	{
		if (оСобытиеКасания.target.closest('[data-тащилка]'))
		{
			оСобытиеКасания.preventDefault();
		}

		if (оСобытиеКасания.changedTouches.length === оСобытиеКасания.touches.length)
		{
			_чИдОсновногоУказателя = оСобытиеКасания.changedTouches.item(0).identifier;
		}

		ДляКаждогоИзмененногоКасания(оСобытиеКасания, оКасание =>
		{
			СоздатьИПослатьСобытиеУказателяДляКасания(оСобытиеКасания, оКасание, 'pointerover', true, true, 0, 1);

			const моПолучатели = [оКасание.target];
			for (let оПолучатель = оКасание.target; оПолучатель = оПолучатель.parentElement;)
			{
				моПолучатели.push(оПолучатель);
			}
			for (let ы = моПолучатели.length; --ы >= 0;)
			{
				СоздатьИПослатьСобытиеУказателяДляКасания(оСобытиеКасания, оКасание, 'pointerenter', false, false, 0, 1, моПолучатели[ы]);
			}
				
			СоздатьИПослатьСобытиеУказателяДляКасания(оСобытиеКасания, оКасание, 'pointerdown', true, true, 0, 1);
		});
	});

	const ОбработатьTouchMove = ДобавитьОбработчикИсключений(оСобытиеКасания =>
	{
		ДляКаждогоИзмененногоКасания(оСобытиеКасания, оКасание =>
		{
			СоздатьИПослатьСобытиеУказателяДляКасания(оСобытиеКасания, оКасание, 'pointermove', true, true, -1, 1);
		});
	});

	const ОбработатьTouchEnd = ДобавитьОбработчикИсключений(оСобытиеКасания =>
	{
		if (оСобытиеКасания.target.closest('[data-тащилка]'))
		{
			оСобытиеКасания.preventDefault();
		}
		ОбработатьTouchEndИлиCancel(оСобытиеКасания, false);
	});

	const ОбработатьTouchCancel = ДобавитьОбработчикИсключений(оСобытиеКасания =>
	{
		ОбработатьTouchEndИлиCancel(оСобытиеКасания, true);
	});

	function ОбработатьTouchEndИлиCancel(оСобытиеКасания, лОтмена)
	{
		ДляКаждогоИзмененногоКасания(оСобытиеКасания, оКасание =>
		{
			if (лОтмена)
			{
				СоздатьИПослатьСобытиеУказателяДляКасания(оСобытиеКасания, оКасание, 'pointercancel', true, false, 0, 0);
			}
			else
			{
				СоздатьИПослатьСобытиеУказателяДляКасания(оСобытиеКасания, оКасание, 'pointerup', true, true, 0, 0);
			}
			СоздатьИПослатьСобытиеУказателяДляКасания(оСобытиеКасания, оКасание, 'pointerout', true, true, 0, 0);
			for (let оПолучатель = оКасание.target; оПолучатель; оПолучатель = оПолучатель.parentElement)
			{
				СоздатьИПослатьСобытиеУказателяДляКасания(оСобытиеКасания, оКасание, 'pointerleave', false, false, 0, 0, оПолучатель);
			}
			if (оКасание.identifier === _чИдОсновногоУказателя)
			{
				_чИдОсновногоУказателя = NaN;
			}
		});
	}

	Object.defineProperty(window, PointerEvent,
	{
		writable: true,
		configurable: true,
		value: PointerEvent
	});

	{
		// Chrome 54-, Firefox 58-
		// Chrome 49: TouchEvent доступен в настрольном браузере независимо от наличия сенсорного устройства.
		м_Журнал.Ой('[PointerEvent] Использую события мыши');
		window.addEventListener('mousedown',  ОбработатьMouseDown,  true);
		window.addEventListener('mousemove',  ОбработатьMouseMove,  true);
		window.addEventListener('mouseup',    ОбработатьMouseUp,    true);
		window.addEventListener('mouseover',  ОбработатьMouseOver,  true);
		window.addEventListener('mouseout',   ОбработатьMouseOut,   true);
	}
})();
