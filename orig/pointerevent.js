'use strict';

(() => {
	const _оСвойства = {
		pointerId: 0,
		width: 1,
		height: 1,
		pressure: 0,
		tangentialPressure: 0,
		tiltX: 0,
		tiltY: 0,
		twist: 0,
		pointerType: '',
		isPrimary: false
	};
	class PointerEvent extends MouseEvent {
		constructor(сТипСобытия, оПараметры = {}) {
			super(сТипСобытия, оПараметры);
			const оОпределениеСвойства = {
				enumerable: true,
				configurable: true
			};
			for (let сИмя of Object.keys(_оСвойства)) {
				if (сИмя in оПараметры) {
					if (typeof оПараметры[сИмя] != typeof _оСвойства[сИмя] || Number.isNaN(оПараметры[сИмя])) {
						throw new TypeError(`В конструктор PointerEvent передан параметр ${сИмя} недопустимого типа`);
					}
					оОпределениеСвойства.value = оПараметры[сИмя];
				} else {
					оОпределениеСвойства.value = _оСвойства[сИмя];
				}
				Object.defineProperty(this, сИмя, оОпределениеСвойства);
			}
		}
	}
	let _лЗадерживатьСообщенияМыши = false;
	function СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, сТипСобытия, button) {
		const оПараметры = {};
		оПараметры.bubbles = оСобытиеМыши.bubbles;
		оПараметры.cancelable = оСобытиеМыши.cancelable;
		оПараметры.composed = true;
		оПараметры.view = оСобытиеМыши.view;
		оПараметры.ctrlKey = оСобытиеМыши.ctrlKey;
		оПараметры.shiftKey = оСобытиеМыши.shiftKey;
		оПараметры.altKey = оСобытиеМыши.altKey;
		оПараметры.metaKey = оСобытиеМыши.metaKey;
		оПараметры.modifierAltGraph = оСобытиеМыши.getModifierState('AltGraph');
		оПараметры.modifierCapsLock = оСобытиеМыши.getModifierState('CapsLock');
		оПараметры.modifierNumLock = оСобытиеМыши.getModifierState('NumLock');
		оПараметры.modifierScrollLock = оСобытиеМыши.getModifierState('ScrollLock');
		оПараметры.screenX = оСобытиеМыши.screenX;
		оПараметры.screenY = оСобытиеМыши.screenY;
		оПараметры.clientX = оСобытиеМыши.clientX;
		оПараметры.clientY = оСобытиеМыши.clientY;
		оПараметры.button = button;
		оПараметры.buttons = оСобытиеМыши.buttons;
		оПараметры.relatedTarget = оСобытиеМыши.relatedTarget;
		оПараметры.pressure = оПараметры.buttons === 0 ? 0 : .5;
		оПараметры.pointerType = 'mouse';
		оПараметры.isPrimary = true;
		const оСобытиеУказателя = new PointerEvent(сТипСобытия, оПараметры);
		Object.defineProperty(оСобытиеУказателя, 'timeStamp', {
			enumerable: true,
			configurable: true,
			value: оСобытиеМыши.timeStamp
		});
		const лОтменено = !оСобытиеМыши.target.dispatchEvent(оСобытиеУказателя);
		if (лОтменено) {
			оСобытиеМыши.preventDefault();
		}
		return лОтменено;
	}
	const ОбработатьMouseDown = ДобавитьОбработчикИсключений(оСобытиеМыши => {
		if ((оСобытиеМыши.buttons & оСобытиеМыши.buttons - 1) == 0) {
			_лЗадерживатьСообщенияМыши = СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointerdown', оСобытиеМыши.button);
		} else {
			СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointermove', оСобытиеМыши.button);
		}
		if (_лЗадерживатьСообщенияМыши) {
			оСобытиеМыши.stopImmediatePropagation();
			оСобытиеМыши.stopPropagation();
		}
	});
	const ОбработатьMouseMove = ДобавитьОбработчикИсключений(оСобытиеМыши => {
		СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointermove', -1);
		if (_лЗадерживатьСообщенияМыши) {
			оСобытиеМыши.stopImmediatePropagation();
			оСобытиеМыши.stopPropagation();
		}
	});
	const ОбработатьMouseUp = ДобавитьОбработчикИсключений(оСобытиеМыши => {
		if (оСобытиеМыши.buttons === 0) {
			СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointerup', оСобытиеМыши.button);
		} else {
			СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointermove', оСобытиеМыши.button);
		}
		if (_лЗадерживатьСообщенияМыши) {
			оСобытиеМыши.stopImmediatePropagation();
			оСобытиеМыши.stopPropagation();
		}
		if (оСобытиеМыши.buttons === 0) {
			_лЗадерживатьСообщенияМыши = false;
		}
	});
	const ОбработатьMouseOver = ДобавитьОбработчикИсключений(оСобытиеМыши => {
		СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointerover', -1);
	});
	const ОбработатьMouseOut = ДобавитьОбработчикИсключений(оСобытиеМыши => {
		СоздатьИПослатьСобытиеУказателяДляМыши(оСобытиеМыши, 'pointerout', -1);
	});
	Object.defineProperty(window, PointerEvent, {
		writable: true,
		configurable: true,
		value: PointerEvent
	});
	м_Журнал.Ой('[PointerEvent] Использую события мыши');
	window.addEventListener('mousedown', ОбработатьMouseDown, true);
	window.addEventListener('mousemove', ОбработатьMouseMove, true);
	window.addEventListener('mouseup', ОбработатьMouseUp, true);
	window.addEventListener('mouseover', ОбработатьMouseOver, true);
	window.addEventListener('mouseout', ОбработатьMouseOut, true);
})();