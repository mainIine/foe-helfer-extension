# Test environment

Tests are using [Jasmine framework](https://jasmine.github.io).

Tests are run by [/test.html](#testhtml), accessed directly within the extension.  
For example, run in the console (on a loaded game page): `copy(extUrl + 'test.html')`, paste copied link into a bookmark.  

This has several consequences:

- [Injector](../js/inject.js) runs within the extension context, which is expected and required.
- Document, the target of injecting, is also within the extension context as opposed to content context.  
  The running code has elevated privileges not present in a release environment.
- The extension code depends on *jQuery*. In a release environment, *jQuery* is loaded by the game itself, in a test environment, [our own version](../vendor/jQuery/jquery.min.js) is loaded.
- *Injector* has had a hard dependency on [languages module](../js/web/_languages/js/_languages.js).  
  As it is also one of injected modules and can't be loaded twice, the dependency is soft now.  
  In a test environment, *injector* falls back to a default, later loads *languages* as usual.  
  In a release environment, *languages* is loaded within the extension context with injector utilizing it, later it is loaded again within the content context as usual.
- The code (tests as well modules under test), having extension privileges, has access to actual local storage and databases of a release environment - the same as *injector* and [/background.js](../background.js) have.  
  Extra care needs to be taken when testing stuff that touches storage - code can access information not present in release, and can alter information presently used in release - including, but not limited to, extension information, GUI language preference, and [Alerts](../js/web/alerts/js/alerts.js).

# Files & Folders organisation

## [/test.html](../test.html)

The tests specs runner. Loads *Jasmine*, *FoE Helper* modules, test modules.  
Tests are now run on `foe-helper#loaded` event, as the original `load` event is unreliable for this purpose - frequently `load` is fired earlier than `foe-helper#loaded`, resulting in unresolved references.  
Currently test modules are linked directly here. See [TODO](#known-limitations--issues--things-to-do) below.

## [/vendor/jasmine](../vendor/jasmine/)

Jasmine framework files.  
Should a file need to be altered, it is copied and altered into [/test](#test), with a copy left here for reference.

## [/test](./)

Common and shared files.

### [testtools.js](testtools.js), [testtoolsspecs.js](testtoolsspecs.js)

Test tools / utilities with their own tests.

## */js/web/${modulename}/test/*

Test specs for a particular module.

From the topmost suite name it should be easy to identify/locate the file the suite is in.  
`tt.getModuleSuiteName()` was implemented to facilitate that, returns the filename it is used in. This assumes there is an association between test module filename and the module it belongs to.  
Thus the recommended filename is `modulename.js`. Also see [TODO](#known-limitations--issues--things-to-do) below.

# Known limitations / issues / things to do

- Test modules are hard-linked in [/test.html](#testhtml).

  Add loading them dynamically, referencing the same [/js/internal.json](../js/internal.json) as *injector* is using.  
  Planned supported test module names are `${modulename}.js` and `${modulename}N.js`, where *N* is a number, starting from *1*.  
  Numbers need to increase sequentially, that is, *(1,2,3,...,k)*. After the missing one *(k+1)*, further ones will not be discovered / loaded.  
  This test module splitting will allow for more flexible maintenance of larger files.

- Test environment reset.

  The usual paradigm is that each test suite prepares environment to its requirements in `beforeAll`/`beforeEach` and cleans up afterwards in `afterAll`/`afterEach`.  
  The challenge here is that if a module accesses another module (e.g. most modules refer to *MainParser*, *BlueGalaxy* refers to *Productions*, *InfoBoard* refers to *GuildFights* and *Discord*), it needs to reset that one as well.  
  Currently, this would be still achievable by implementing and calling all appropriate module resets.  
  However, after adding support for loading and simulating requests and responses (see below), this might no longer be easily done.  
  A response intended to test funcionality of one module may change the state of another module, possibly triggering unrelated errors.  
  The planned solution to this is to implement helper-wide reset - a global reset utility function which calls all appropriate (i.e. having a tag requested by the resetter) modules' reset function.  
  This would make modules unrelated to current test responsible for proper reaction only from a known zero state, not from all possible states created as a side-effect in various other tests.  

- Test environment (non-)reset in interactive mode.

  Investigate ways to not perform the cleanup of `after*`, so the environment stays intact after a test (if it was the last/sole one to run).  
  This could facilitate interactively diagnosing failed tests, and develop new tests, including GUI-related tests.

- Support for loading data files.

  Currently, it should be possible to load data files ad-hoc with `fetch`. Formalize this.  
  Shared data files will be in `/test/data/`, module's private data files will be in `/js/web/${modulename}/test/data/`.  
  This will allow separating large (input) data from the test itself, 

- Support for large result tests.

  In addition to simple tests (small input, small result) and semi-complex tests (large input, small result), large result tests support could be useful to have.  
  These kinds of tests could be characterised by the output result that is created either procedurally from small input, or by transforming a large input.
  This output then creates the baseline the future results are compared against.
  The focus is less on the actual results, and more on detecting the changed result and patterns of differences.  
  The plan is to add tools for handling the large result during testing (loading and comparing as objects),
  and after testing (saving the result(s) in file(s) suitable for comparing with external line-based diff tool, and moving it back into repository - replacing the old result).  

- Support for simulating server requests and responses.

  Add loading a specified data file and simulate it arriving from the server, triggering all appropriate registered handlers.

- In the future, the *FoE Helper extension* release procedure will need to be altered to not include test files in the released archive.

  Presently and in the short term, I don't expect the effect to matter much (total test files size is about 4% of the total (uncompressed) extension size.  
  In the long term, especially after formalized support for loading of data files (see above), the effect will be substantial - I expect e.g. the full 30MB *CityEntities* data file to be included and used for testing.

- Errors unrelated to running tests.

  When the browser environment was set up incorrectly and the background service worker failed, attempts at communication of *Alerts* with it were causing errors that affected running tests.  
  As a quick workaround, the errors were degraded to console logs to not affect the results of tests.

- GUI-related tests.

  A test can create and test GUI elements.  
  However, their automated testing is limited to DOM API access only. Evaluating the visual result and rendering of all applied css styles is currently possible manually only.  
  The options for automating it and possible challenges of compatibility across browsers/OSes have not been explored.
