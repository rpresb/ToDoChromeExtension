const API_KEY = "d2b78ef6a773647c89617e129c6e34d7";
const APP_NAME = "ToDoChromeExtension";
const AUTHORIZE_URL = "https://trello.com/1/authorize";
const AUTHORIZE_URL_QUERY = "?key=[KEY]&name=[NAME]&expiration=1day&response_type=token&scope=read,write&return_url=" + APP_NAME;
const BOARDS_URL = "https://trello.com/1/members/my/boards?key=[KEY]&token=[TOKEN]";
const BOARD_CREATE_URL = "https://trello.com/1/boards?key=[KEY]&token=[TOKEN]&name=[NAME]";
const LISTS_URL = "https://api.trello.com/1/boards/[BOARD_ID]/lists?cards=open&card_fields=name&fields=name&key=[KEY]&token=[TOKEN]";
const CARD_CREATE_URL = "https://trello.com/1/cards?key=[KEY]&token=[TOKEN]&idList=[LIST_ID]&name=";
const CARD_UPDATE_URL = "https://trello.com/1/cards/[CARD_ID]?key=[KEY]&token=[TOKEN]&name=";
const CARD_DELETE_URL = "https://trello.com/1/cards/[CARD_ID]?key=[KEY]&token=[TOKEN]";
const CARD_MOVE_URL = "https://trello.com/1/cards/[CARD_ID]?idList=[LIST_ID]&key=[KEY]&token=[TOKEN]";

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

function showInit() {
    var self = this;
    getValue("token", function (value) {
        console.log("token", value.token);

        const jumbotron = $(".jumbotron");
        const autorizado = $(".autorizado");

        jumbotron.hide();
        autorizado.hide();

        if (!value.token) {
            jumbotron.show();

            $("#btnAutorizar")
                .attr('href', AUTHORIZE_URL + AUTHORIZE_URL_QUERY
                    .replace('[KEY]', API_KEY)
                    .replace('[NAME]', APP_NAME))
                .click(function (e) {
                    chrome.tabs.create({url: $(e.currentTarget).attr('href')}, function (tab) {
                        setValue("tabId", tab.id);
                    });
                });
        } else {
            self.token = value.token;

            autorizado.show();

            loadBoard(value.token);

            $("#btnSair").click(function (e) {
                logoff();
            });
        }
    });
}

function logoff() {
    setValue("token", null);
    showInit();
}

function loading(show) {
    if (show) {
        $("#loading").show();
    } else {
        $("#loading").hide();
    }
}

function loadBoard() {
    var self = this;
    getJSON(BOARDS_URL.replace('[KEY]', API_KEY).replace('[TOKEN]', token), function (data) {
        if (data === "expired token") {
            logoff();
            return;
        }

        self.appBoard = null;

        data.some(function (board) {
            if (board.name === APP_NAME && !board.closed) {
                console.log(board);
                self.appBoard = board;
                return true;
            }
            return false;
        });

        if (!appBoard) {
            post(BOARD_CREATE_URL
                .replace('[KEY]', API_KEY)
                .replace('[TOKEN]', self.token)
                .replace('[NAME]', APP_NAME), function (data) {
                self.appBoard = data;

                loadLists();
            });
        } else {
            loadLists();
        }
    }, function (jqxhr, textStatus, error) {
        if (jqxhr.status === 401) {
            logoff();
        }
    });
}

function clearList() {
    $(".row:not(.hide)").remove();
}

function loadLists() {
    var self = this;

    getJSON(LISTS_URL
        .replace('[KEY]', API_KEY)
        .replace('[TOKEN]', self.token)
        .replace('[BOARD_ID]', self.appBoard.id), function (data) {

        clearList();

        data.forEach(function (list) {
            var done = false;

            if (list.name === "To Do") {
                self.toDoList = list;
            } else if (list.name === "Done") {
                self.doneList = list;
                done = true;
            }

            if (list.cards) {
                list.cards.forEach(function (card) {
                    showCard(card, done);
                });
            }
        });

        showCard({id: "new", name: ""}, false);
    });
}

function showCard(card, done) {
    var template = $("#template").clone().attr('id', 'card_' + card.id).removeClass("hide");

    $("input[type=text]", template)
        .val(card.name)
        .on('change', function (e) {
            saveCard($(this));
        });

    $("input[type=checkbox]", template)
        .on('change', function (e) {
            moveCard(this);
        });

    if (card.id === 'new') {
        $("input[type=checkbox]", template).attr('disabled', 'disabled');
    }

    if (done) {
        $("input[type=checkbox]", template).attr('checked', 'checked');
    }

    $("#todo-container").append(template);
}

function moveCard(checkbox) {
    var cardId = $(checkbox).parent().parent().parent().parent().attr('id').replace('card_', '');

    put(CARD_MOVE_URL
        .replace('[KEY]', API_KEY)
        .replace('[TOKEN]', self.token)
        .replace('[CARD_ID]', cardId)
        .replace('[LIST_ID]', (checkbox.checked ? self.doneList.id : self.toDoList.id)), function () {
        console.log('moved');
        loadLists();
    });

}

function saveCard(input) {
    var cardId = input.parent().parent().parent().attr('id').replace('card_', '');

    if (input.val().length === 0) {
        if (cardId !== 'new') {
            sendDelete(CARD_DELETE_URL
                .replace('[KEY]', API_KEY)
                .replace('[TOKEN]', self.token)
                .replace('[CARD_ID]', cardId), function () {
                console.log('deleted');
                loadLists();
            });
        }
    } else {
        if (cardId === 'new') {
            post(CARD_CREATE_URL
                .replace('[KEY]', API_KEY)
                .replace('[TOKEN]', self.token)
                .replace('[LIST_ID]', self.toDoList.id) + encodeURIComponent(input.val()), function () {
                console.log('created');

                loadLists();
            });
        } else {
            put(CARD_UPDATE_URL
                .replace('[KEY]', API_KEY)
                .replace('[TOKEN]', self.token)
                .replace('[CARD_ID]', cardId) + encodeURIComponent(input.val()), function () {
                console.log('updated');
            });
        }

    }
}

function post(url, callback) {
    loading(true);
    $.post(url, function (data) {
        loading(false);
        callback(data);
    });
}

function put(url, callback) {
    loading(true);

    $.ajax({
        url: url,
        type: 'PUT',
        success: function (data) {
            loading(false);
            callback(data);
        }
    });
}

function sendDelete(url, callback) {
    loading(true);

    $.ajax({
        url: url,
        type: 'DELETE',
        success: function (data) {
            loading(false);
            callback(data);
        }
    });
}


function getJSON(url, callback, errorCallback) {
    loading(true);

    $.getJSON(url)
        .done(function (json) {
            callback(json);
        })
        .fail(function (jqxhr, textStatus, error) {
            errorCallback(jqxhr, textStatus, error);
        })
        .always(function () {
            setTimeout(function () {
                loading(false);
            }, 500);
        });
}

document.addEventListener('DOMContentLoaded', function () {
    showInit();
});
