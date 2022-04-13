[//]: # (DO NOT EDIT THIS FILE! This is an auto-generated file. Editing for this document happens in /commands-yml/commands/device/app/close-app.yml)
# 终止 App 运行

终止 app 在设备上运行
[//]: # (DO NOT EDIT THIS FILE! This is an auto-generated file. Editing for this document happens in /commands-yml/commands/device/app/close-app.yml)
## 示范用法

```java
// Java
driver.closeApp();

```

```python
# Python
self.driver.close_app()

```

```javascript
// Javascript
// webdriver.io 例子
driver.closeApp();

// wd 例子
await driver.closeApp();

```

```ruby
# Ruby
# ruby_lib 例子
close_app

# ruby_lib_core 例子
@driver.close_app

```

```php
# PHP
$driver->closeApp();

```

```csharp
// C#
driver.CloseApp();

```


[//]: # (DO NOT EDIT THIS FILE! This is an auto-generated file. Editing for this document happens in /commands-yml/commands/device/app/close-app.yml)
## 帮助文档

[//]: # (DO NOT EDIT THIS FILE! This is an auto-generated file. Editing for this document happens in /commands-yml/commands/device/app/close-app.yml)
### Appium Server

|平台|Driver|平台版本|Appium 版本|Driver 版本|
|--------|----------------|------|--------------|--------------|
| iOS | [XCUITest](/docs/cn/drivers/ios-xcuitest.md) | 9.3+ | 1.6.0+ | All |
|  | [UIAutomation](/docs/cn/drivers/ios-uiautomation.md) | 8.0 to 9.3 | All | All |
| Android | [Espresso](/docs/cn/drivers/android-espresso.md) | None | None | None |
|  | [UiAutomator2](/docs/cn/drivers/android-uiautomator2.md) | ?+ | 1.6.0+ | All |
|  | [UiAutomator](/docs/cn/drivers/android-uiautomator.md) | 4.3+ | All | All |
| Mac | [Mac](/docs/cn/drivers/mac.md) | None | None | None |
| Windows | [Windows](/docs/cn/drivers/windows.md) | None | None | None |


[//]: # (DO NOT EDIT THIS FILE! This is an auto-generated file. Editing for this document happens in /commands-yml/commands/device/app/close-app.yml)
### Appium 客户端

|语言|是否支持|文档|
|--------|-------|-------------|
|[Java](https://github.com/appium/java-client/releases/latest)| All | [appium.github.io](https://appium.github.io/java-client/io/appium/java_client/InteractsWithApps.html#closeApp--) |
|[Python](https://github.com/appium/python-client/releases/latest)| All | [appium.github.io](https://appium.github.io/python-client-sphinx/webdriver.extensions.html#webdriver.extensions.applications.Applications.close_app) |
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)| All |  |
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| All | [github.com](https://github.com/admc/wd/blob/master/lib/commands.js#L2798) |
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)| All | [www.rubydoc.info](https://www.rubydoc.info/github/appium/ruby_lib_core/Appium/Core/Device#close_app-instance_method) |
|[PHP](https://github.com/appium/php-client/releases/latest)| All | [github.com](https://github.com/appium/php-client/) |
|[C#](https://github.com/appium/appium-dotnet-driver/releases/latest)| All | [github.com](https://github.com/appium/appium-dotnet-driver/blob/master/src/Appium.Net/Appium/AppiumDriver.cs) |

[//]: # (DO NOT EDIT THIS FILE! This is an auto-generated file. Editing for this document happens in /commands-yml/commands/device/app/close-app.yml)
## HTTP API 规范

[//]: # (DO NOT EDIT THIS FILE! This is an auto-generated file. Editing for this document happens in /commands-yml/commands/device/app/close-app.yml)
### Endpoint

`POST /session/:session_id/appium/app/close`

[//]: # (DO NOT EDIT THIS FILE! This is an auto-generated file. Editing for this document happens in /commands-yml/commands/device/app/close-app.yml)
### URL 参数

|字段名| 说明 |
|----|-----------|
|session_id|通过命令去路由的session id|

[//]: # (DO NOT EDIT THIS FILE! This is an auto-generated file. Editing for this document happens in /commands-yml/commands/device/app/close-app.yml)
### JSON 参数

无

[//]: # (DO NOT EDIT THIS FILE! This is an auto-generated file. Editing for this document happens in /commands-yml/commands/device/app/close-app.yml)
### 响应（Response）

无

[//]: # (DO NOT EDIT THIS FILE! This is an auto-generated file. Editing for this document happens in /commands-yml/commands/device/app/close-app.yml)
## 另请参阅

* [JSONWP 说明书](https://github.com/appium/appium-base-driver/blob/master/lib/protocol/routes.js#L550)