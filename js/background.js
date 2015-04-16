const CALLBACK_URL = "https://trello.com/1/token/ToDoChromeExtension#token=";

function setValue(key, value) {

    var obj = {};
    obj[key] = value;

    console.log("set", obj);

    chrome.storage.sync.set(obj, function () {
        console.log("ok");
    });
}

function getValue(key, callback) {
    chrome.storage.sync.get(key, function (value) {
        callback(value);
    });
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    getValue("tabId", function (value) {
        if (value.tabId === tabId) {
            if (changeInfo.status === "complete" && tab.url.indexOf(CALLBACK_URL) > -1) {

                var token = tab.url.replace(CALLBACK_URL, "");
                setValue("token", token);

                chrome.tabs.remove(tabId, function () {
                });
            }

        }
    });
});
