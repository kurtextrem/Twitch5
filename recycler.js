'use strict';

self.onmessage = e =>
{
	if (!e.data)
	{
		close();
	}
};