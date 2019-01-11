'use strict';

function AsmjsModule(stdlib, foreign, heap)
{
	'use asm';

	var _abHeap = new stdlib.Uint8Array(heap);
	var _aiHeap = new stdlib.Int32Array(heap);

	function SearchStartCodePrefix(pStream, pStreamEnd)
	// ITU-T H.264:2014 Annex B
	// Ищет start code prefix: минимум два нулевых байта, за ними единица.
	// Состав префикса в зависимости от его длины:
	// =3 - start_code_prefix_one_3bytes
	// =4 - zero_byte + start_code_prefix_one_3bytes
	// >4 - leading_zero_8bits или trailing_zero_8bits + zero_byte + start_code_prefix_one_3bytes
	// Возвращает указатель на начало префикса. В Int32Array(heap)[0] возвращает размер префикса.
	// Если префикс не найден, то возвращает pStreamEnd. Размер не определен.
	// Если данные повреждены, то возвращает -2.
	// Выход параметров функции за пределы буфера не проверяется.
	{
		pStream = pStream|0;
		pStreamEnd = pStreamEnd|0;

		var pStreamEnd3 = 0, uByte = 0, pStart = 0;

		pStreamEnd3 = (pStreamEnd - 3)|0;
		if ((pStream|0) > (pStreamEnd3|0))
		{
			return pStreamEnd|0;
		}

		for (;;)
		{
			// Большую часть времени выполняется следующий код
			// ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
			uByte = _abHeap[(pStream + 2) >> 0]|0;
			if ((uByte|0) > 1)
			{
				pStream = (pStream + 3)|0;
				if ((pStream|0) <= (pStreamEnd3|0))
				{
					continue;
				}
				return pStreamEnd|0;
			}
			// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
			if ((_abHeap[(pStream + 1) >> 0]|0) != 0)
			{
				pStream = (pStream + 2)|0;
				if ((pStream|0) <= (pStreamEnd3|0))
				{
					continue;
				}
				return pStreamEnd|0;
			}
			if ((_abHeap[pStream >> 0]|0) != 0)
			{
				pStream = (pStream + 1)|0;
				if ((pStream|0) <= (pStreamEnd3|0))
				{
					continue;
				}
				return pStreamEnd|0;
			}
			break;
		}

		pStart = pStream;
		// Chrome 67 теряет скорость если прибавить 3.
		pStream = (pStream + 2)|0;

		while ((uByte|0) == 0)
		{
			pStream = (pStream + 1)|0;
			if ((pStream|0) == (pStreamEnd|0))
			{
				return pStreamEnd|0; // trailing_zero_8bits
			}
			uByte = _abHeap[pStream >> 0]|0;
		}
		if ((uByte|0) != 1)
		{
			// Twitch: Иногда в filler data встречаются последовательности нулевых байтов произвольной длины.
			// Они не мешают просмотру, но нарушают несколько правил стандарта H.264.
			return -2|0;
		}

		_aiHeap[0 >> 2] = (pStream - pStart + 1)|0;
		return pStart|0;
	}

	return {SearchStartCodePrefix: SearchStartCodePrefix};
}
