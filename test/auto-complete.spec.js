(function() {
'use strict';

describe('autocomplete-directive', function() {
    var $compile, $scope, $q, $timeout,
        parentCtrl, element, isolateScope, input, suggestionList, deferred, inputChangeHandler, onTagAddedHandler;

    beforeEach(function() {
        module('tags-input');

        inject(function($rootScope, _$compile_, _$q_, _$timeout_) {
            $scope = $rootScope;
            $compile = _$compile_;
            $q = _$q_;
            $timeout = _$timeout_;
        });

        deferred = $q.defer();
        $scope.loadItems = jasmine.createSpy().andReturn(deferred.promise);

        compile();
    });

    function compile() {
        var parent, tagsInput, options;

        input = angular.element('<input type="text">');
        input.changeValue = jasmine.createSpy();
        input.change = jasmine.createSpy().andCallFake(function(handler) { inputChangeHandler = handler; });

        tagsInput = {
            input: input,
            events: {
                on: jasmine.createSpy().andCallFake(function(name, handler) { onTagAddedHandler = handler; })
            }
        };

        parent = $compile('<tags-input ng-model="whatever"></tags-input>')($scope);
        parentCtrl = parent.controller('tagsInput');

        spyOn(parentCtrl, 'registerAutocomplete').andReturn(tagsInput);

        options = jQuery.makeArray(arguments).join(' ');
        element = angular.element('<auto-complete source="loadItems($text)" ' + options + '></auto-complete>');
        parent.append(element);

        $compile(element)($scope);
        $scope.$digest();

        isolateScope = element.isolateScope();
        suggestionList = isolateScope.suggestionList;
    }

    function resolve(items) {
        deferred.resolve(items);
        $scope.$digest();
    }

    function sendKeyDown(keyCode) {
        var event = jQuery.Event('keydown', { keyCode: keyCode });
        input.trigger(event);

        return event;
    }

    function changeInputValue(value) {
        inputChangeHandler(value);
        $scope.$digest();
    }

    function getSuggestionsBox() {
        return element.find('div');
    }

    function getSuggestions() {
        return getSuggestionsBox().find('li');
    }

    function getSuggestion(index) {
        return getSuggestions().eq(index);
    }

    function getSuggestionText(index) {
        return getSuggestion(index).html();
    }

    function isSuggestionsBoxVisible() {
        return !getSuggestionsBox().hasClass('ng-hide');
    }

    function loadSuggestions(items) {
        suggestionList.load('foobar');
        $timeout.flush();
        resolve(items);
    }

    describe('basic features', function() {
        it('ensures that the suggestions list is hidden by default', function() {
            expect(isSuggestionsBoxVisible()).toBe(false);
        });

        it('renders all elements returned by the load function', function() {
            // Act
            loadSuggestions(['Item1','Item2','Item3']);

            // Assert
            expect(getSuggestions().length).toBe(3);
            expect(getSuggestionText(0)).toBe('Item1');
            expect(getSuggestionText(1)).toBe('Item2');
            expect(getSuggestionText(2)).toBe('Item3');
        });

        it('shows the suggestions list when there are items to show', function() {
            // Act
            loadSuggestions(['Item1']);

            // Assert
            expect(isSuggestionsBoxVisible()).toBe(true);
        });

        it('hides the suggestions list when there is no items to show', function() {
            // Act
            loadSuggestions([]);

            // Assert
            expect(isSuggestionsBoxVisible()).toBe(false);
        });

        it('hides the suggestion box when the input field becomes empty', function() {
            // Arrange
            changeInputValue('foobar');
            suggestionList.show();
            $scope.$digest();

            // Act
            changeInputValue('');

            // Assert
            expect(isSuggestionsBoxVisible()).toBe(false);
        });

        it('hides the suggestion box when the escape key is pressed', function() {
            // Arrange
            suggestionList.show();
            $scope.$digest();

            // Act
            sendKeyDown(KEYS.escape);

            // Assert
            expect(isSuggestionsBoxVisible()).toBe(false);
        });

        it('hides the suggestion box when the user clicks elsewhere on the page', function() {
            // Arrange
            suggestionList.show();
            $scope.$digest();

            // Act
            $(document).trigger('click');

            // Assert
            expect(isSuggestionsBoxVisible()).toBe(false);
        });

        it('hides the suggestion box after adding the selected suggestion to the input field', function() {
            // Arrange
            loadSuggestions(['Item1', 'Item2']);
            suggestionList.select(0);

            // Act
            sendKeyDown(KEYS.enter);

            // Assert
            expect(isSuggestionsBoxVisible()).toBe(false);
        });

        it('hides the suggestion box when a tag is added', function() {
            // Arrange
            suggestionList.show();

            // Act
            onTagAddedHandler();

            // Assert
            expect(isSuggestionsBoxVisible()).toBe(false);
        });

        it('adds the selected suggestion to the input field when the enter key is pressed and the suggestions box is visible', function() {
            // Arrange
            loadSuggestions(['Item1', 'Item2']);
            suggestionList.select(0);

            // Act
            sendKeyDown(KEYS.enter);

            // Assert
            expect(input.changeValue).toHaveBeenCalledWith('Item1');
        });

        it('adds the selected suggestion to the input field when the tab key is pressed and there is a suggestion selected', function() {
            // Arrange
            loadSuggestions(['Item1', 'Item2']);
            suggestionList.select(0);

            // Act
            sendKeyDown(KEYS.tab);

            // Assert
            expect(input.changeValue).toHaveBeenCalledWith('Item1');
        });

        it('does not change the input value when the enter key is pressed and there is nothing selected', function() {
            // Arrange
            loadSuggestions(['Item1', 'Item2']);

            // Act
            sendKeyDown(KEYS.enter);

            // Assert
            expect(input.changeValue).not.toHaveBeenCalled();
        });

        it('sets the selected suggestion to null after adding it to the input field', function() {
            // Arrange
            loadSuggestions(['Item1', 'Item2']);
            suggestionList.select(0);

            // Act
            isolateScope.addSuggestion();

            // Assert
            expect(suggestionList.selected).toBeNull();
        });

        it('does not call the load function after adding the selected suggestion to the input field', function() {
            // Arrange
            loadSuggestions(['Item1', 'Item2']);
            suggestionList.select(0);

            // Act
            sendKeyDown(KEYS.enter);

            // Assert
            expect($scope.loadItems.callCount).toBe(1);
        });

        it('highlights the selected suggestion only', function() {
            // Arrange
            loadSuggestions(['Item1', 'Item2', 'Item3']);

            // Act
            suggestionList.select(1);
            $scope.$digest();

            // Assert
            expect(getSuggestion(0).hasClass('selected')).toBe(false);
            expect(getSuggestion(1).hasClass('selected')).toBe(true);
            expect(getSuggestion(2).hasClass('selected')).toBe(false);
        });

        it('selects no suggestion after the suggestion box is shown', function() {
            // Arrange/Act
            loadSuggestions(['Item1', 'Item2']);

            // Assert
            expect(suggestionList.selected).toBeNull();
        });
    });

    describe('navigation through suggestions', function() {
        describe('downward', function() {
            it('selects the next suggestion when the down arrow key is pressed and there\'s something selected', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2']);
                suggestionList.select(0);

                // Act
                sendKeyDown(KEYS.down);

                // Assert
                expect(suggestionList.selected).toBe('Item2');
            });

            it('selects the first suggestion when the down arrow key is pressed and the last item is selected', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2']);
                suggestionList.select(1);

                // Act
                sendKeyDown(KEYS.down);

                // Assert
                expect(suggestionList.selected).toBe('Item1');
            });
        });

        describe('upward', function() {
            it('selects the prior suggestion when the down up key is pressed and there\'s something selected', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2']);
                suggestionList.select(1);

                // Act
                sendKeyDown(KEYS.up);

                // Assert
                expect(suggestionList.selected).toBe('Item1');
            });

            it('selects the last suggestion when the up arrow key is pressed and the first item is selected', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2']);
                suggestionList.select(0);

                // Act
                sendKeyDown(KEYS.up);

                // Assert
                expect(suggestionList.selected).toBe('Item2');
            });
        });

        describe('mouse', function() {
            it('selects the suggestion under the mouse pointer', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2', 'Item3']);

                // Act
                getSuggestion(1).mouseenter();

                // Assert
                expect(suggestionList.selected).toBe('Item2');
            });

            it('adds the selected suggestion to the input field when a mouse click is triggered', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2', 'Item3']);
                getSuggestion(1).mouseenter();

                // Act
                getSuggestion(1).click();

                // Assert
                expect(input.changeValue).toHaveBeenCalledWith('Item2');
            });

            it('focuses the input field when a suggestion is added via a mouse click', function() {
                // Arrange
                loadSuggestions(['Item1', 'Item2', 'Item3']);
                suggestionList.select(0);
                spyOn(input[0], 'focus');

                // Act
                getSuggestion(1).click();

                // Assert
                expect(input[0].focus).toHaveBeenCalled();
            });
        });
    });

    describe('hotkeys propagation handling - suggestion box is visible', function() {
        beforeEach(function() {
            suggestionList.show();
        });

        it('prevents the down arrow keydown event from being propagated', function() {
            // Act
            var event = sendKeyDown(KEYS.down);

            // Assert
            expect(event.isDefaultPrevented()).toBe(true);
            expect(event.isPropagationStopped()).toBe(true);
        });

        it('prevents the up arrow keydown event from being propagated', function() {
            // Act
            var event = sendKeyDown(KEYS.up);

            // Assert
            expect(event.isDefaultPrevented()).toBe(true);
            expect(event.isPropagationStopped()).toBe(true);
        });

        it('prevents the enter keydown event from being propagated if there is a suggestion selected', function() {
            // Arrange
            suggestionList.selected = 'suggestion';

            // Act
            var event = sendKeyDown(KEYS.enter);

            // Assert
            expect(event.isDefaultPrevented()).toBe(true);
            expect(event.isPropagationStopped()).toBe(true);
        });

        it('does not prevent the enter keydown event from begin propagated if there is no suggestion selected', function() {
            // Arrange
            suggestionList.selected = null;

            // Act
            var event = sendKeyDown(KEYS.enter);

            // Assert
            expect(event.isDefaultPrevented()).toBe(false);
            expect(event.isPropagationStopped()).toBe(false);
        });

        it('prevents the tab keydown event from being propagated if there is a suggestion selected', function() {
            // Arrange
            suggestionList.selected = 'suggestion';

            // Act
            var event = sendKeyDown(KEYS.tab);

            // Assert
            expect(event.isDefaultPrevented()).toBe(true);
            expect(event.isPropagationStopped()).toBe(true);
        });

        it('does not prevent the tab keydown event from being propagated if there is no suggestion selected', function() {
            // Arrange
            suggestionList.selected = null;

            // Act
            var event = sendKeyDown(KEYS.tab);

            // Assert
            expect(event.isDefaultPrevented()).toBe(false);
            expect(event.isPropagationStopped()).toBe(false);
        });

        it('prevents the escape keydown event from being propagated', function() {
            // Act
            var event = sendKeyDown(KEYS.escape);

            // Assert
            expect(event.isDefaultPrevented()).toBe(true);
            expect(event.isPropagationStopped()).toBe(true);
        });
    });

    describe('hotkeys propagation handling - suggestion box is hidden', function() {
        beforeEach(function() {
            suggestionList.reset();
        });

        it('does not prevent the down arrow keydown event from being propagated', function() {
            // Act
            var event = sendKeyDown(KEYS.down);

            // Assert
            expect(event.isDefaultPrevented()).toBe(false);
            expect(event.isPropagationStopped()).toBe(false);
        });

        it('does not prevent the up arrow keydown event from being propagated', function() {
            // Act
            var event = sendKeyDown(KEYS.up);

            // Assert
            expect(event.isDefaultPrevented()).toBe(false);
            expect(event.isPropagationStopped()).toBe(false);
        });

        it('does not prevent the enter keydown event from being propagated', function() {
            // Act
            var event = sendKeyDown(KEYS.enter);

            // Assert
            expect(event.isDefaultPrevented()).toBe(false);
            expect(event.isPropagationStopped()).toBe(false);
        });

        it('does not prevent the tab keydown event from being propagated', function() {
            // Act
            var event = sendKeyDown(KEYS.tab);

            // Assert
            expect(event.isDefaultPrevented()).toBe(false);
            expect(event.isPropagationStopped()).toBe(false);
        });

        it('does not prevent the escape keydown event from being propagated', function() {
            // Act
            var event = sendKeyDown(KEYS.escape);

            // Assert
            expect(event.isDefaultPrevented()).toBe(false);
            expect(event.isPropagationStopped()).toBe(false);
        });
    });

    describe('debounce-delay option', function() {
        it('initializes the option to 100 milliseconds', function() {
            // Arrange/Act
            compile();

            // Assert
            expect(isolateScope.options.debounceDelay).toBe(100);
        });

        it('sets the option given a static string', function() {
            // Arrange/Act
            compile('debounce-delay="1000"');

            // Assert
            expect(isolateScope.options.debounceDelay).toBe(1000);
        });

        it('sets the option given an interpolated string', function() {
            // Arrange/Act
            $scope.value = 1000;
            compile('debounce-delay="{{ value }}"');

            // Assert
            expect(isolateScope.options.debounceDelay).toBe(1000);
        });

        it('doesn\'t call the load function immediately', function() {
            // Arrange
            compile('debounce-delay="100"');

            // Act
            changeInputValue('A');
            changeInputValue('AB');
            changeInputValue('ABC');

            // Assert
            expect($scope.loadItems).not.toHaveBeenCalled();
        });

        it('calls the load function only after a delay has passed', function() {
            // Arrange
            compile('debounce-delay="100"');

            // Act
            changeInputValue('A');
            changeInputValue('AB');
            changeInputValue('ABC');

            $timeout.flush(100);

            // Assert
            expect($scope.loadItems).toHaveBeenCalledWith('ABC');
        });

        it('doesn\'t call the load function when the reset method is called', function() {
            // Arrange
            compile();
            changeInputValue('A');

            // Act
            suggestionList.reset();
            $timeout.flush();

            // Assert
            expect($scope.loadItems).not.toHaveBeenCalled();

        });
    });

    describe('min-length option', function() {
        it('initializes the option to 3', function() {
            // Arrange/Act
            compile();

            // Assert
            expect(isolateScope.options.minLength).toBe(3);
        });

        it('sets the option given a static string', function() {
            // Arrange/Act
            compile('min-length="5"');

            // Assert
            expect(isolateScope.options.minLength).toBe(5);
        });

        it('sets the option given an interpolated string', function() {
            // Arrange/Act
            $scope.value = 5;
            compile('min-length="{{ value }}"');

            // Assert
            expect(isolateScope.options.minLength).toBe(5);
        });

        it('calls the load function only after the minimum amount of characters has been entered', function() {
            // Arrange
            compile('min-length="3"');

            // Act
            changeInputValue('A');
            changeInputValue('AB');
            changeInputValue('ABC');

            $timeout.flush();

            // Assert
            expect($scope.loadItems.calls.length).toBe(1);
            expect($scope.loadItems.calls[0].args[0]).toBe('ABC');
        });

        it('doesn\'t call the load function when the minimum amount of characters isn\'t entered', function() {
            // Arrange
            compile('min-length="3"');

            // Act
            changeInputValue('A');
            changeInputValue('AB');

            $timeout.flush();

            // Assert
            expect($scope.loadItems).not.toHaveBeenCalled();
        });

        it('hides the suggestion box when the number of entered characters is less than the option value', function() {
            // Arrange
            compile('min-length="5"');
            suggestionList.show();

            // Act
            changeInputValue('ABCD');

            // Assert
            expect(isSuggestionsBoxVisible()).toBe(false);
        });
    });
});

})();