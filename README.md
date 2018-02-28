# Improved Video Player for Twitch (Twitch 5)

The Twitch 5 extension updated for Chrome, **all credit goes to Alexander Choporov (CoolCmd)**.

To get this extension running (if you're a dev), follow these steps:

1. Download the [ZIP](https://github.com/kurtextrem/Twitch5/archive/master.zip) archive of the repository.
2. Unpack somewhere.

<table>
	<tr>
		<th>Chrome</th>
	</tr>
	<tr>
		<td>
			<ol>
				<li>Open <code>chrome://extensions</code>
				<li>Check the <strong>Developer mode</strong> checkbox
				<li>Click on the <strong>Load unpacked extension</strong> button
				<li>Select the folder <code>where you unpacked the ZIP</code>
			</ol>
		</td>
	</tr>
</table>

# Changes vs. Original

The last available Chrome extension source code is from 2017. Alexander is still updating the extension and does a great job.
Why Google removed it from the Webstore is unknown (I'd guess either icon copyright or Twitch claimed copyright on the name of the extension).

So I did the following:

- Took the manifest from the last Chrome version, removed some sketchy permissions
- Checked for sketchy URLs (**There are none!**)
- Ported the latest version from the Firefox Addon Store to Chrome (from February 2018)

More Technical:

- Enabled ASM (by replacing russian code, that Chrome somehow did not like)
- Fixed CSS
- Added a few other performance tweaks (using CSS, e.g. `contain`)