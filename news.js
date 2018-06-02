﻿'use strict';

// 0 - версия расширения, она же дата новости
// 1 - код заголовка новости
// >= 2 - код текста новости (длина текста < 1024 символа)
const г_мНовости =
[
	// ↓↓↓ Показывать всегда
	['2000.2.2',   'J1003', 'F1000'],
	// ↓↓↓ Вставлять сюда
	['2018.5.18',  'J1010', 'F1049'],
	['2018.4.24',  'J1036', 'F1048'],
	['2018.4.6',   'J1010', 'F1047'],
	['2018.3.17',  'J1010', 'F1046'],
	['2018.3.4',   'J1041', 'F1042'],
	['2018.2.17',  'J1010', 'F1044'],
	['2018.1.7',   'J1010', 'F1043'],
	['2017.11.6',  'J1010', 'F1037', 'F1038'],
	['2017.10.22', 'J1010', 'F1023'],
	['2017.10.14', 'J1010', 'F1020'],
	['2017.9.11',  'J1010', 'F1018'],
	['2017.8.8',   'J1035', 'F1017'],
	['2017.6.23',  'J1010', 'F1014'],
	['2017.5.29',  'J1010', 'F1013'],
	['2017.3.31',  'J1031', 'F1012'],
	['2017.2.26',  'J1030', 'F1011'],
	// ↑↑↑ Удалять отсюда
	// ↓↓↓ Справка
	['2000.1.1',   'J1004', 'F1001', 'F1002', 'F1024', 'F1050', 'F1027']
];
