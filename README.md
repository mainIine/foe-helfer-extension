## FoE Helper
##### An extension for the Browser Game Forge of Empires to install in all Chromium based browsers like Google Chrome, Opera, Chromium or Microsoft Edge, Brave etc. and FireFox

[![Translation status](http://i18n.foe-helper.com/widgets/foe-helper/-/extension/svg-badge.svg)](http://i18n.foe-helper.com/engage/foe-helper/?utm_source=widget)


A manual for most modules and installation can be found here: [FoE Helper Docs](https://docs.foe-helper.com/english/installing)

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/J3J52SY3V)

###### FAQ

For questions and answers please use our [Discord](https://discord.gg/z97KZq4) server.


###### Bugs & Wishes

If you find an error or have a request, please use the [ticket system](https://github.com/mainIine/foe-helfer-extension/issues).

_This is an Open Source Project under the [AGPLv3 License](LICENSE.md)._

###### Building a release
The browser packages are generated from `manifests/` (shared `base.json` plus one overlay per browser). The root `manifest.json` is for local development only.

```bash
node manifests/build.js --zip
```

creates `foe-v<version>.zip` (Chrome), `foe-v<version>-edge.zip` (Edge) and `foe-v<version>-firefox.zip`. Pass a version (`node manifests/build.js 4.9.0.0 --zip`) to bump it first.
