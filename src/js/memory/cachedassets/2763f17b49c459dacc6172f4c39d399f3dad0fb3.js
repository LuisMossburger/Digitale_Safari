var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var H5P = H5P || {};

/**
 * H5P-Timer
 *
 * General purpose timer that can be used by other H5P libraries.
 *
 * @param {H5P.jQuery} $
 */
H5P.Timer = function ($, EventDispatcher) {
  /**
   * Create a timer.
   *
   * @constructor
   * @param {number} [interval=Timer.DEFAULT_INTERVAL] - The update interval.
   */
  function Timer() {
    var interval = arguments.length <= 0 || arguments[0] === undefined ? Timer.DEFAULT_INTERVAL : arguments[0];

    var self = this;

    // time on clock and the time the clock has run
    var clockTimeMilliSeconds = 0;
    var playingTimeMilliSeconds = 0;

    // used to update recurring notifications
    var clockUpdateMilliSeconds = 0;

    // indicators for total running time of the timer
    var firstDate = null;
    var startDate = null;
    var lastDate = null;

    // update loop
    var loop = null;

    // timer status
    var status = Timer.STOPPED;

    // indicate counting direction
    var mode = Timer.FORWARD;

    // notifications
    var notifications = [];

    // counter for notifications;
    var notificationsIdCounter = 0;

    // Inheritance
    H5P.EventDispatcher.call(self);

    // sanitize interval
    if (Timer.isInteger(interval)) {
      interval = Math.max(interval, 1);
    }
    else {
      interval = Timer.DEFAULT_INTERVAL;
    }

    /**
     * Get the timer status.
     *
     * @public
     * @return {number} The timer status.
     */
    self.getStatus = function () {
      return status;
    };

    /**
     * Get the timer mode.
     *
     * @public
     * @return {number} The timer mode.
     */
    self.getMode = function () {
      return mode;
    };

    /**
     * Get the time that's on the clock.
     *
     * @private
     * @return {number} The time on the clock.
     */
    var getClockTime = function getClockTime() {
      return clockTimeMilliSeconds;
    };

    /**
     * Get the time the timer was playing so far.
     *
     * @private
     * @return {number} The time played.
     */
    var getPlayingTime = function getPlayingTime() {
      return playingTimeMilliSeconds;
    };

    /**
     * Get the total running time from play() until stop().
     *
     * @private
     * @return {number} The total running time.
     */
    var getRunningTime = function getRunningTime() {
      if (!firstDate) {
        return 0;
      }
      if (status !== Timer.STOPPED) {
        return new Date().getTime() - firstDate.getTime();
      }
      else {
        return !lastDate ? 0 : lastDate.getTime() - firstDate;
      }
    };

    /**
     * Get one of the times.
     *
     * @public
     * @param {number} [type=Timer.TYPE_CLOCK] - Type of the time to get.
     * @return {number} Clock Time, Playing Time or Running Time.
     */
    self.getTime = function () {
      var type = arguments.length <= 0 || arguments[0] === undefined ? Timer.TYPE_CLOCK : arguments[0];

      if (!Timer.isInteger(type)) {
        return;
      }
      // break will never be reached, but for consistency...
      switch (type) {
        case Timer.TYPE_CLOCK:
          return getClockTime();
          break;
        case Timer.TYPE_PLAYING:
          return getPlayingTime();
          break;
        case Timer.TYPE_RUNNING:
          return getRunningTime();
          break;
        default:
          return getClockTime();
      }
    };

    /**
     * Set the clock time.
     *
     * @public
     * @param {number} time - The time in milliseconds.
     */
    self.setClockTime = function (time) {
      if ($.type(time) === 'string') {
        time = Timer.toMilliseconds(time);
      }
      if (!Timer.isInteger(time)) {
        return;
      }
      // notifications only need an update if changing clock against direction
      clockUpdateMilliSeconds = (time - clockTimeMilliSeconds) * mode < 0 ? time - clockTimeMilliSeconds : 0;
      clockTimeMilliSeconds = time;
    };

    /**
     * Reset the timer.
     *
     * @public
     */
    self.reset = function () {
      if (status !== Timer.STOPPED) {
        return;
      }
      clockTimeMilliSeconds = 0;
      playingTimeMilliSeconds = 0;

      firstDate = null;
      lastDate = null;

      loop = null;

      notifications = [];
      notificationsIdCounter = 0;
      self.trigger('reset', {}, {bubbles: true, external: true});
    };

    /**
     * Set timer mode.
     *
     * @public
     * @param {number} mode - The timer mode.
     */
    self.setMode = function (direction) {
      if (direction !== Timer.FORWARD && direction !== Timer.BACKWARD) {
        return;
      }
      mode = direction;
    };

    /**
     * Start the timer.
     *
     * @public
     */
    self.play = function () {
      if (status === Timer.PLAYING) {
        return;
      }
      if (!firstDate) {
        firstDate = new Date();
      }
      startDate = new Date();
      status = Timer.PLAYING;
      self.trigger('play', {}, {bubbles: true, external: true});
      update();
    };

    /**
     * Pause the timer.
     *
     * @public
     */
    self.pause = function () {
      if (status !== Timer.PLAYING) {
        return;
      }
      status = Timer.PAUSED;
      self.trigger('pause', {}, {bubbles: true, external: true});
    };

    /**
     * Stop the timer.
     *
     * @public
     */
    self.stop = function () {
      if (status === Timer.STOPPED) {
        return;
      }
      lastDate = new Date();
      status = Timer.STOPPED;
      self.trigger('stop', {}, {bubbles: true, external: true});
    };

    /**
     * Update the timer until Timer.STOPPED.
     *
     * @private
     */
    var update = function update() {
      var currentMilliSeconds = 0;
      // stop because requested
      if (status === Timer.STOPPED) {
        clearTimeout(loop);
        return;
      }

      //stop because countdown reaches 0
      if (mode === Timer.BACKWARD && clockTimeMilliSeconds <= 0) {
        self.stop();
        return;
      }

      // update times
      if (status === Timer.PLAYING) {
        currentMilliSeconds = new Date().getTime() - startDate;
        clockTimeMilliSeconds += currentMilliSeconds * mode;
        playingTimeMilliSeconds += currentMilliSeconds;
      }
      startDate = new Date();

      checkNotifications();

      loop = setTimeout(function () {
        update();
      }, interval);
    };

    /**
     * Get next notification id.
     *
     * @private
     * @return {number} id - The next id.
     */
    var getNextNotificationId = function getNextNotificationId() {
      return notificationsIdCounter++;
    };

    /**
     * Set a notification
     *
     * @public
     * @param {Object|String} params - Parameters for the notification.
     * @callback callback - Callback function.
     * @return {number} ID of the notification.
     */
    self.notify = function (params, callback) {
      var id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : getNextNotificationId();

      // common default values for the clock timer
      // TODO: find a better place for this, maybe a JSON file?
      var defaults = {};
      defaults['every_tenth_second'] = { "repeat": 100 };
      defaults['every_second'] = { "repeat": 1000 };
      defaults['every_minute'] = { "repeat": 60000 };
      defaults['every_hour'] = { "repeat": 3600000 };

      // Sanity check for callback function
      if (!callback instanceof Function) {
        return;
      }

      // Get default values
      if ($.type(params) === 'string') {
        params = defaults[params];
      }

      if (params !== null && (typeof params === 'undefined' ? 'undefined' : _typeof(params)) === 'object') {
        // Sanitize type
        if (!params.type) {
          params.type = Timer.TYPE_CLOCK;
        }
        else {
          if (!Timer.isInteger(params.type)) {
            return;
          }
          if (params.type < Timer.TYPE_CLOCK || params.type > Timer.TYPE_RUNNING) {
            return;
          }
        }

        // Sanitize mode
        if (!params.mode) {
          params.mode = Timer.NOTIFY_ABSOLUTE;
        }
        else {
          if (!Timer.isInteger(params.mode)) {
            return;
          }
          if (params.mode < Timer.NOTIFY_ABSOLUTE || params.type > Timer.NOTIFY_RELATIVE) {
            return;
          }
        }

        // Sanitize calltime
        if (!params.calltime) {
          params.calltime = params.mode === Timer.NOTIFY_ABSOLUTE ? self.getTime(params.type) : 0;
        }
        else {
          if ($.type(params.calltime) === 'string') {
            params.calltime = Timer.toMilliseconds(params.calltime);
          }
          if (!Timer.isInteger(params.calltime)) {
            return;
          }
          if (params.calltime < 0) {
            return;
          }
          if (params.mode === Timer.NOTIFY_RELATIVE) {
            params.calltime = Math.max(params.calltime, interval);
            if (params.type === Timer.TYPE_CLOCK) {
              // clock could be running backwards
              params.calltime *= mode;
            }
            params.calltime += self.getTime(params.type);
          }
        }

        // Sanitize repeat
        if ($.type(params.repeat) === 'string') {
          params.repeat = Timer.toMilliseconds(params.repeat);
        }
        // repeat must be >= interval (ideally multiple of interval)
        if (params.repeat !== undefined) {
          if (!Timer.isInteger(params.repeat)) {
            return;
          }
          params.repeat = Math.max(params.repeat, interval);
        }
      }
      else {
        // neither object nor string
        return;
      }

      // add notification
      notifications.push({
        'id': id,
        'type': params.type,
        'calltime': params.calltime,
        'repeat': params.repeat,
        'callback': callback
      });

      return id;
    };

    /**
     * Remove a notification.
     *
     * @public
     * @param {number} id - The id of the notification.
     */
    self.clearNotification = function (id) {
      notifications = $.grep(notifications, function (item) {
        return item.id === id;
      }, true);
    };

    /**
     * Set a new starting time for notifications.
     *
     * @private
     * @param elements {Object] elements - The notifications to be updated.
     * @param deltaMilliSeconds {Number} - The time difference to be set.
     */
    var updateNotificationTime = function updateNotificationTime(elements, deltaMilliSeconds) {
      if (!Timer.isInteger(deltaMilliSeconds)) {
        return;
      }
      elements.forEach(function (element) {
        // remove notification
        self.clearNotification(element.id);

        //rebuild notification with new data
        self.notify({
          'type': element.type,
          'calltime': self.getTime(element.type) + deltaMilliSeconds,
          'repeat': element.repeat
        }, element.callback, element.id);
      });
    };

    /**
     * Check notifications for necessary callbacks.
     *
     * @private
     */
    var checkNotifications = function checkNotifications() {
      var backwards = 1;
      var elements = [];

      // update recurring clock notifications if clock was changed
      if (clockUpdateMilliSeconds !== 0) {
        elements = $.grep(notifications, function (item) {
          return item.type === Timer.TYPE_CLOCK && item.repeat != undefined;
        });
        updateNotificationTime(elements, clockUpdateMilliSeconds);
        clockUpdateMilliSeconds = 0;
      }

      // check all notifications for triggering
      notifications.forEach(function (element) {
        /*
         * trigger if notification time is in the past
         * which means calltime >= Clock Time if mode is BACKWARD (= -1)
         */
        backwards = element.type === Timer.TYPE_CLOCK ? mode : 1;
        if (element.calltime * backwards <= self.getTime(element.type) * backwards) {
          // notify callback function
          element.callback.apply(this);

          // remove notification
          self.clearNotification(element.id);

          // You could use updateNotificationTime() here, but waste some time

          // rebuild notification if it should be repeated
          if (element.repeat) {
            self.notify({
              'type': element.type,
              'calltime': self.getTime(element.type) + element.repeat * backwards,
              'repeat': element.repeat
            }, element.callback, element.id);
          }
        }
      });
    };
  }

  // Inheritance
  Timer.prototype = Object.create(H5P.EventDispatcher.prototype);
  Timer.prototype.constructor = Timer;

  /**
   * Generate timecode elements from milliseconds.
   *
   * @private
   * @param {number} milliSeconds - The milliseconds.
   * @return {Object} The timecode elements.
   */
  var toTimecodeElements = function toTimecodeElements(milliSeconds) {
    var years = 0;
    var month = 0;
    var weeks = 0;
    var days = 0;
    var hours = 0;
    var minutes = 0;
    var seconds = 0;
    var tenthSeconds = 0;

    if (!Timer.isInteger(milliSeconds)) {
      return;
    }
    milliSeconds = Math.round(milliSeconds / 100);
    tenthSeconds = milliSeconds - Math.floor(milliSeconds / 10) * 10;
    seconds = Math.floor(milliSeconds / 10);
    minutes = Math.floor(seconds / 60);
    hours = Math.floor(minutes / 60);
    days = Math.floor(hours / 24);
    weeks = Math.floor(days / 7);
    month = Math.floor(days / 30.4375); // roughly (30.4375 = mean of 4 years)
    years = Math.floor(days / 365); // roughly (no leap years considered)
    return {
      years: years,
      month: month,
      weeks: weeks,
      days: days,
      hours: hours,
      minutes: minutes,
      seconds: seconds,
      tenthSeconds: tenthSeconds
    };
  };

  /**
   * Extract humanized time element from time for concatenating.
   *
   * @public
   * @param {number} milliSeconds - The milliSeconds.
   * @param {string} element - Time element: hours, minutes, seconds or tenthSeconds.
   * @param {boolean} [rounded=false] - If true, element value will be rounded.
   * @return {number} The time element.
   */
  Timer.extractTimeElement = function (time, element) {
    var rounded = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

    var timeElements = null;

    if ($.type(time) === 'string') {
      time = Timer.toMilliseconds(time);
    }
    if (!Timer.isInteger(time)) {
      return;
    }
    if ($.type(element) !== 'string') {
      return;
    }
    if ($.type(rounded) !== 'boolean') {
      return;
    }

    if (rounded) {
      timeElements = {
        years: Math.round(time / 31536000000),
        month: Math.round(time / 2629800000),
        weeks: Math.round(time / 604800000),
        days: Math.round(time / 86400000),
        hours: Math.round(time / 3600000),
        minutes: Math.round(time / 60000),
        seconds: Math.round(time / 1000),
        tenthSeconds: Math.round(time / 100)
      };
    }
    else {
      timeElements = toTimecodeElements(time);
    }

    return timeElements[element];
  };

  /**
   * Convert time in milliseconds to timecode.
   *
   * @public
   * @param {number} milliSeconds - The time in milliSeconds.
   * @return {string} The humanized timecode.
   */
  Timer.toTimecode = function (milliSeconds) {
    var timecodeElements = null;
    var timecode = '';

    var minutes = 0;
    var seconds = 0;

    if (!Timer.isInteger(milliSeconds)) {
      return;
    }
    if (milliSeconds < 0) {
      return;
    }

    timecodeElements = toTimecodeElements(milliSeconds);
    minutes = Math.floor(timecodeElements['minutes'] % 60);
    seconds = Math.floor(timecodeElements['seconds'] % 60);

    // create timecode
    if (timecodeElements['hours'] > 0) {
      timecode += timecodeElements['hours'] + ':';
    }
    if (minutes < 10) {
      timecode += '0';
    }
    timecode += minutes + ':';
    if (seconds < 10) {
      timecode += '0';
    }
    timecode += seconds + '.';
    timecode += timecodeElements['tenthSeconds'];

    return timecode;
  };

  /**
   * Convert timecode to milliseconds.
   *
   * @public
   * @param {string} timecode - The timecode.
   * @return {number} Milliseconds derived from timecode
   */
  Timer.toMilliseconds = function (timecode) {
    var head = [];
    var tail = '';

    var hours = 0;
    var minutes = 0;
    var seconds = 0;
    var tenthSeconds = 0;

    if (!Timer.isTimecode(timecode)) {
      return;
    }

    // thx to the regexp we know everything can be converted to a legit integer in range
    head = timecode.split('.')[0].split(':');
    while (head.length < 3) {
      head = ['0'].concat(head);
    }
    hours = parseInt(head[0]);
    minutes = parseInt(head[1]);
    seconds = parseInt(head[2]);

    tail = timecode.split('.')[1];
    if (tail) {
      tenthSeconds = Math.round(parseInt(tail) / Math.pow(10, tail.length - 1));
    }

    return (hours * 36000 + minutes * 600 + seconds * 10 + tenthSeconds) * 100;
  };

  /**
   * Check if a string is a timecode.
   *
   * @public
   * @param {string} value - String to check
   * @return {boolean} true, if string is a timecode
   */
  Timer.isTimecode = function (value) {
    var reg_timecode = /((((((\d+:)?([0-5]))?\d:)?([0-5]))?\d)(\.\d+)?)/;

    if ($.type(value) !== 'string') {
      return false;
    }

    return value === value.match(reg_timecode)[0] ? true : false;
  };

  // Workaround for IE and potentially other browsers within Timer object
  Timer.isInteger = Timer.isInteger || function(value) {
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
  };

  // Timer states
  /** @constant {number} */
  Timer.STOPPED = 0;
  /** @constant {number} */
  Timer.PLAYING = 1;
  /** @constant {number} */
  Timer.PAUSED = 2;

  // Timer directions
  /** @constant {number} */
  Timer.FORWARD = 1;
  /** @constant {number} */
  Timer.BACKWARD = -1;

  /** @constant {number} */
  Timer.DEFAULT_INTERVAL = 10;

  // Counter types
  /** @constant {number} */
  Timer.TYPE_CLOCK = 0;
  /** @constant {number} */
  Timer.TYPE_PLAYING = 1;
  /** @constant {number} */
  Timer.TYPE_RUNNING = 2;

  // Notification types
  /** @constant {number} */
  Timer.NOTIFY_ABSOLUTE = 0;
  /** @constant {number} */
  Timer.NOTIFY_RELATIVE = 1;

  return Timer;
}(H5P.jQuery, H5P.EventDispatcher);
;
H5P.MemoryGame = (function (EventDispatcher, $) {

  // We don't want to go smaller than 100px per card(including the required margin)
  var CARD_MIN_SIZE = 100; // PX
  var CARD_STD_SIZE = 116; // PX
  var STD_FONT_SIZE = 16; // PX
  var LIST_PADDING = 1; // EMs
  var numInstances = 0;

  /**
   * Memory Game Constructor
   *
   * @class H5P.MemoryGame
   * @extends H5P.EventDispatcher
   * @param {Object} parameters
   * @param {Number} id
   */
  function MemoryGame(parameters, id) {
    /** @alias H5P.MemoryGame# */
    var self = this;

    // Initialize event inheritance
    EventDispatcher.call(self);

    var flipped, timer, counter, popup, $bottom, $taskComplete, $feedback, $wrapper, maxWidth, numCols, audioCard;
    var cards = [];
    var flipBacks = []; // Que of cards to be flipped back
    var numFlipped = 0;
    var removed = 0;
    numInstances++;

    // Add defaults
    parameters = $.extend(true, {
      l10n: {
        cardTurns: 'Card turns',
        timeSpent: 'Time spent',
        feedback: 'Good work!',
        tryAgain: 'Reset',
        closeLabel: 'Close',
        label: 'Memory Game. Find the matching cards.',
        done: 'All of the cards have been found.',
        cardPrefix: 'Card %num: ',
        cardUnturned: 'Unturned.',
        cardMatched: 'Match found.'
      }
    }, parameters);

    /**
     * Check if these two cards belongs together.
     *
     * @private
     * @param {H5P.MemoryGame.Card} card
     * @param {H5P.MemoryGame.Card} mate
     * @param {H5P.MemoryGame.Card} correct
     */
    var check = function (card, mate, correct) {
      if (mate !== correct) {
        // Incorrect, must be scheduled for flipping back
        flipBacks.push(card);
        flipBacks.push(mate);

        // Wait for next click to flip them back…
        if (numFlipped > 2) {
          // or do it straight away
          processFlipBacks();
        }
        return;
      }

      // Update counters
      numFlipped -= 2;
      removed += 2;

      var isFinished = (removed === cards.length);

      // Remove them from the game.
      card.remove(!isFinished);
      mate.remove();

      var desc = card.getDescription();
      if (desc !== undefined) {
        // Pause timer and show desciption.
        timer.pause();
        var imgs = [card.getImage()];
        if (card.hasTwoImages) {
          imgs.push(mate.getImage());
        }
        popup.show(desc, imgs, cardStyles ? cardStyles.back : undefined, function (refocus) {
          if (isFinished) {
            // Game done
            card.makeUntabbable();
            finished();
          }
          else {
            // Popup is closed, continue.
            timer.play();

            if (refocus) {
              card.setFocus();
            }
          }
        });
      }
      else if (isFinished) {
        // Game done
        card.makeUntabbable();
        finished();
      }
    };

    /**
     * Game has finished!
     * @private
     */
    var finished = function () {
      timer.stop();
      $taskComplete.show();
      $feedback.addClass('h5p-show'); // Announce
      $bottom.focus();

      // Create and trigger xAPI event 'completed'
      var completedEvent = self.createXAPIEventTemplate('completed');
      completedEvent.setScoredResult(1, 1, self, true, true);
      completedEvent.data.statement.result.duration = 'PT' + (Math.round(timer.getTime() / 10) / 100) + 'S';
      self.trigger(completedEvent);

      if (parameters.behaviour && parameters.behaviour.allowRetry) {
        // Create retry button
        var retryButton = createButton('reset', parameters.l10n.tryAgain || 'Reset', function () {
          // Trigger handler (action)

          retryButton.classList.add('h5p-memory-transout');
          setTimeout(function () {
            // Remove button on nextTick to get transition effect
            $wrapper[0].removeChild(retryButton);
          }, 300);

          resetGame();
        });
        retryButton.classList.add('h5p-memory-transin');
        setTimeout(function () {
          // Remove class on nextTick to get transition effectupd
          retryButton.classList.remove('h5p-memory-transin');
        }, 0);

        // Same size as cards
        retryButton.style.fontSize = (parseFloat($wrapper.children('ul')[0].style.fontSize) * 0.75) + 'px';

        $wrapper[0].appendChild(retryButton); // Add to DOM
      }
    };

    /**
     * Shuffle the cards and restart the game!
     * @private
     */
    var resetGame = function () {

      // Reset cards
      removed = 0;

      // Remove feedback
      $feedback[0].classList.remove('h5p-show');
      $taskComplete.hide();

      // Reset timer and counter
      timer.reset();
      counter.reset();

      // Randomize cards
      H5P.shuffleArray(cards);

      setTimeout(function () {
        // Re-append to DOM after flipping back
        for (var i = 0; i < cards.length; i++) {
          cards[i].reAppend();
        }
        for (var j = 0; j < cards.length; j++) {
          cards[j].reset();
        }

        // Scale new layout
        $wrapper.children('ul').children('.h5p-row-break').removeClass('h5p-row-break');
        maxWidth = -1;
        self.trigger('resize');
        cards[0].setFocus();
      }, 600);
    };

    /**
     * Game has finished!
     * @private
     */
    var createButton = function (name, label, action) {
      var buttonElement = document.createElement('div');
      buttonElement.classList.add('h5p-memory-' + name);
      buttonElement.innerHTML = label;
      buttonElement.setAttribute('role', 'button');
      buttonElement.tabIndex = 0;
      buttonElement.addEventListener('click', function () {
        action.apply(buttonElement);
      }, false);
      buttonElement.addEventListener('keypress', function (event) {
        if (event.which === 13 || event.which === 32) { // Enter or Space key
          event.preventDefault();
          action.apply(buttonElement);
        }
      }, false);
      return buttonElement;
    };

    /**
     * Adds card to card list and set up a flip listener.
     *
     * @private
     * @param {H5P.MemoryGame.Card} card
     * @param {H5P.MemoryGame.Card} mate
     */
    var addCard = function (card, mate) {
      card.on('flip', function () {
        if (audioCard) {
          audioCard.stopAudio();
        }

        // Always return focus to the card last flipped
        for (var i = 0; i < cards.length; i++) {
          cards[i].makeUntabbable();
        }
        card.makeTabbable();

        popup.close();
        self.triggerXAPI('interacted');
        // Keep track of time spent
        timer.play();

        // Keep track of the number of flipped cards
        numFlipped++;

        // Announce the card unless it's the last one and it's correct
        var isMatched = (flipped === mate);
        var isLast = ((removed + 2) === cards.length);
        card.updateLabel(isMatched, !(isMatched && isLast));

        if (flipped !== undefined) {
          var matie = flipped;
          // Reset the flipped card.
          flipped = undefined;

          setTimeout(function () {
            check(card, matie, mate);
          }, 800);
        }
        else {
          if (flipBacks.length > 1) {
            // Turn back any flipped cards
            processFlipBacks();
          }

          // Keep track of the flipped card.
          flipped = card;
        }

        // Count number of cards turned
        counter.increment();
      });
      card.on('audioplay', function () {
        if (audioCard) {
          audioCard.stopAudio();
        }
        audioCard = card;
      });
      card.on('audiostop', function () {
        audioCard = undefined;
      });

      /**
       * Create event handler for moving focus to the next or the previous
       * card on the table.
       *
       * @private
       * @param {number} direction +1/-1
       * @return {function}
       */
      var createCardChangeFocusHandler = function (direction) {
        return function () {
          // Locate next card
          for (var i = 0; i < cards.length; i++) {
            if (cards[i] === card) {
              // Found current card

              var nextCard, fails = 0;
              do {
                fails++;
                nextCard = cards[i + (direction * fails)];
                if (!nextCard) {
                  return; // No more cards
                }
              }
              while (nextCard.isRemoved());

              card.makeUntabbable();
              nextCard.setFocus();

              return;
            }
          }
        };
      };

      // Register handlers for moving focus to next and previous card
      card.on('next', createCardChangeFocusHandler(1));
      card.on('prev', createCardChangeFocusHandler(-1));

      /**
       * Create event handler for moving focus to the first or the last card
       * on the table.
       *
       * @private
       * @param {number} direction +1/-1
       * @return {function}
       */
      var createEndCardFocusHandler = function (direction) {
        return function () {
          var focusSet = false;
          for (var i = 0; i < cards.length; i++) {
            var j = (direction === -1 ? cards.length - (i + 1) : i);
            if (!focusSet && !cards[j].isRemoved()) {
              cards[j].setFocus();
              focusSet = true;
            }
            else if (cards[j] === card) {
              card.makeUntabbable();
            }
          }
        };
      };

      // Register handlers for moving focus to first and last card
      card.on('first', createEndCardFocusHandler(1));
      card.on('last', createEndCardFocusHandler(-1));

      cards.push(card);
    };

    /**
     * Will flip back two and two cards
     */
    var processFlipBacks = function () {
      flipBacks[0].flipBack();
      flipBacks[1].flipBack();
      flipBacks.splice(0, 2);
      numFlipped -= 2;
    };

    /**
     * @private
     */
    var getCardsToUse = function () {
      var numCardsToUse = (parameters.behaviour && parameters.behaviour.numCardsToUse ? parseInt(parameters.behaviour.numCardsToUse) : 0);
      if (numCardsToUse <= 2 || numCardsToUse >= parameters.cards.length) {
        // Use all cards
        return parameters.cards;
      }

      // Pick random cards from pool
      var cardsToUse = [];
      var pickedCardsMap = {};

      var numPicket = 0;
      while (numPicket < numCardsToUse) {
        var pickIndex = Math.floor(Math.random() * parameters.cards.length);
        if (pickedCardsMap[pickIndex]) {
          continue; // Already picked, try again!
        }

        cardsToUse.push(parameters.cards[pickIndex]);
        pickedCardsMap[pickIndex] = true;
        numPicket++;
      }

      return cardsToUse;
    };

    var cardStyles, invertShades;
    if (parameters.lookNFeel) {
      // If the contrast between the chosen color and white is too low we invert the shades to create good contrast
      invertShades = (parameters.lookNFeel.themeColor &&
                      getContrast(parameters.lookNFeel.themeColor) < 1.7 ? -1 : 1);
      var backImage = (parameters.lookNFeel.cardBack ? H5P.getPath(parameters.lookNFeel.cardBack.path, id) : null);
      cardStyles = MemoryGame.Card.determineStyles(parameters.lookNFeel.themeColor, invertShades, backImage);
    }

    // Initialize cards.
    var cardsToUse = getCardsToUse();
    for (var i = 0; i < cardsToUse.length; i++) {
      var cardParams = cardsToUse[i];
      if (MemoryGame.Card.isValid(cardParams)) {
        // Create first card
        var cardTwo, cardOne = new MemoryGame.Card(cardParams.image, id, cardParams.imageAlt, parameters.l10n, cardParams.description, cardStyles, cardParams.audio);

        if (MemoryGame.Card.hasTwoImages(cardParams)) {
          // Use matching image for card two
          cardTwo = new MemoryGame.Card(cardParams.match, id, cardParams.matchAlt, parameters.l10n, cardParams.description, cardStyles, cardParams.matchAudio);
          cardOne.hasTwoImages = cardTwo.hasTwoImages = true;
        }
        else {
          // Add two cards with the same image
          cardTwo = new MemoryGame.Card(cardParams.image, id, cardParams.imageAlt, parameters.l10n, cardParams.description, cardStyles, cardParams.audio);
        }

        // Add cards to card list for shuffeling
        addCard(cardOne, cardTwo);
        addCard(cardTwo, cardOne);
      }
    }
    H5P.shuffleArray(cards);

    /**
     * Attach this game's html to the given container.
     *
     * @param {H5P.jQuery} $container
     */
    self.attach = function ($container) {
      this.triggerXAPI('attempted');
      // TODO: Only create on first attach!
      $wrapper = $container.addClass('h5p-memory-game').html('');
      if (invertShades === -1) {
        $container.addClass('h5p-invert-shades');
      }

      // Add cards to list
      var $list = $('<ul/>', {
        role: 'application',
        'aria-labelledby': 'h5p-intro-' + numInstances
      });
      for (var i = 0; i < cards.length; i++) {
        cards[i].appendTo($list);
      }
      cards[0].makeTabbable();

      if ($list.children().length) {
        $('<div/>', {
          id: 'h5p-intro-' + numInstances,
          'class': 'h5p-memory-hidden-read',
          html: parameters.l10n.label,
          appendTo: $container
        });
        $list.appendTo($container);

        $bottom = $('<div/>', {
          'class': 'h5p-programatically-focusable',
          tabindex: '-1',
          appendTo: $container
        });
        $taskComplete = $('<div/>', {
          'class': 'h5p-memory-complete h5p-memory-hidden-read',
          html: parameters.l10n.done,
          appendTo: $bottom
        });

        $feedback = $('<div class="h5p-feedback">' + parameters.l10n.feedback + '</div>').appendTo($bottom);

        // Add status bar
        var $status = $('<dl class="h5p-status">' +
                        '<dt>' + parameters.l10n.timeSpent + ':</dt>' +
                        '<dd class="h5p-time-spent"><time role="timer" datetime="PT0M0S">0:00</time><span class="h5p-memory-hidden-read">.</span></dd>' +
                        '<dt>' + parameters.l10n.cardTurns + ':</dt>' +
                        '<dd class="h5p-card-turns">0<span class="h5p-memory-hidden-read">.</span></dd>' +
                        '</dl>').appendTo($bottom);

        timer = new MemoryGame.Timer($status.find('time')[0]);
        counter = new MemoryGame.Counter($status.find('.h5p-card-turns'));
        popup = new MemoryGame.Popup($container, parameters.l10n);

        $container.click(function () {
          popup.close();
        });
      }
    };

    /**
     * Will try to scale the game so that it fits within its container.
     * Puts the cards into a grid layout to make it as square as possible –
     * which improves the playability on multiple devices.
     *
     * @private
     */
    var scaleGameSize = function () {

      // Check how much space we have available
      var $list = $wrapper.children('ul');

      var newMaxWidth = parseFloat(window.getComputedStyle($list[0]).width);
      if (maxWidth === newMaxWidth) {
        return; // Same size, no need to recalculate
      }
      else {
        maxWidth = newMaxWidth;
      }

      // Get the card holders
      var $elements = $list.children();
      if ($elements.length < 4) {
        return; // No need to proceed
      }

      // Determine the optimal number of columns
      var newNumCols = Math.ceil(Math.sqrt($elements.length));

      // Do not exceed the max number of columns
      var maxCols = Math.floor(maxWidth / CARD_MIN_SIZE);
      if (newNumCols > maxCols) {
        newNumCols = maxCols;
      }

      if (numCols !== newNumCols) {
        // We need to change layout
        numCols = newNumCols;

        // Calculate new column size in percentage and round it down (we don't
        // want things sticking out…)
        var colSize = Math.floor((100 / numCols) * 10000) / 10000;
        $elements.css('width', colSize + '%').each(function (i, e) {
          if (i === numCols) {
            $(e).addClass('h5p-row-break');
          }
        });
      }

      // Calculate how much one percentage of the standard/default size is
      var onePercentage = ((CARD_STD_SIZE * numCols) + STD_FONT_SIZE) / 100;
      var paddingSize = (STD_FONT_SIZE * LIST_PADDING) / onePercentage;
      var cardSize = (100 - paddingSize) / numCols;
      var fontSize = (((maxWidth * (cardSize / 100)) * STD_FONT_SIZE) / CARD_STD_SIZE);

      // We use font size to evenly scale all parts of the cards.
      $list.css('font-size', fontSize + 'px');
      popup.setSize(fontSize);
      // due to rounding errors in browsers the margins may vary a bit…
    };

    if (parameters.behaviour && parameters.behaviour.useGrid && cardsToUse.length) {
      self.on('resize', scaleGameSize);
    }
  }

  // Extends the event dispatcher
  MemoryGame.prototype = Object.create(EventDispatcher.prototype);
  MemoryGame.prototype.constructor = MemoryGame;

  /**
   * Determine color contrast level compared to white(#fff)
   *
   * @private
   * @param {string} color hex code
   * @return {number} From 1 to Infinity.
   */
  var getContrast = function (color) {
    return 255 / ((parseInt(color.substr(1, 2), 16) * 299 +
                   parseInt(color.substr(3, 2), 16) * 587 +
                   parseInt(color.substr(5, 2), 16) * 144) / 1000);
  };

  return MemoryGame;
})(H5P.EventDispatcher, H5P.jQuery);
;
(function (MemoryGame, EventDispatcher, $) {

  /**
   * Controls all the operations for each card.
   *
   * @class H5P.MemoryGame.Card
   * @extends H5P.EventDispatcher
   * @param {Object} image
   * @param {number} id
   * @param {string} alt
   * @param {Object} l10n Localization
   * @param {string} [description]
   * @param {Object} [styles]
   */
  MemoryGame.Card = function (image, id, alt, l10n, description, styles, audio) {
    /** @alias H5P.MemoryGame.Card# */
    var self = this;

    // Initialize event inheritance
    EventDispatcher.call(self);

    var path, width, height, $card, $wrapper, removedState, flippedState, audioPlayer;

    alt = alt || 'Missing description'; // Default for old games

    if (image && image.path) {
      path = H5P.getPath(image.path, id);

      if (image.width !== undefined && image.height !== undefined) {
        if (image.width > image.height) {
          width = '100%';
          height = 'auto';
        }
        else {
          height = '100%';
          width = 'auto';
        }
      }
      else {
        width = height = '100%';
      }
    }

    if (audio) {
      // Check if browser supports audio.
      audioPlayer = document.createElement('audio');
      if (audioPlayer.canPlayType !== undefined) {
        // Add supported source files.
        for (var i = 0; i < audio.length; i++) {
          if (audioPlayer.canPlayType(audio[i].mime)) {
            var source = document.createElement('source');
            source.src = H5P.getPath(audio[i].path, id);
            source.type = audio[i].mime;
            audioPlayer.appendChild(source);
          }
        }
      }

      if (!audioPlayer.children.length) {
        audioPlayer = null; // Not supported
      }
      else {
        audioPlayer.controls = false;
        audioPlayer.preload = 'auto';

        var handlePlaying = function () {
          if ($card) {
            $card.addClass('h5p-memory-audio-playing');
            self.trigger('audioplay');
          }
        };
        var handleStopping = function () {
          if ($card) {
            $card.removeClass('h5p-memory-audio-playing');
            self.trigger('audiostop');
          }
        };
        audioPlayer.addEventListener('play', handlePlaying);
        audioPlayer.addEventListener('ended', handleStopping);
        audioPlayer.addEventListener('pause', handleStopping);
      }
    }

    /**
     * Update the cards label to make it accessible to users with a readspeaker
     *
     * @param {boolean} isMatched The card has been matched
     * @param {boolean} announce Announce the current state of the card
     * @param {boolean} reset Go back to the default label
     */
    self.updateLabel = function (isMatched, announce, reset) {

      // Determine new label from input params
      var label = (reset ? l10n.cardUnturned : alt);
      if (isMatched) {
        label = l10n.cardMatched + ' ' + label;
      }

      // Update the card's label
      $wrapper.attr('aria-label', l10n.cardPrefix.replace('%num', $wrapper.index() + 1) + ' ' + label);

      // Update disabled property
      $wrapper.attr('aria-disabled', reset ? null : 'true');

      // Announce the label change
      if (announce) {
        $wrapper.blur().focus(); // Announce card label
      }
    };

    /**
     * Flip card.
     */
    self.flip = function () {
      if (flippedState) {
        $wrapper.blur().focus(); // Announce card label again
        return;
      }

      $card.addClass('h5p-flipped');
      self.trigger('flip');
      flippedState = true;

      if (audioPlayer) {
        audioPlayer.play();
      }
    };

    /**
     * Flip card back.
     */
    self.flipBack = function () {
      self.stopAudio();
      self.updateLabel(null, null, true); // Reset card label
      $card.removeClass('h5p-flipped');
      flippedState = false;
    };

    /**
     * Remove.
     */
    self.remove = function () {
      $card.addClass('h5p-matched');
      removedState = true;
    };

    /**
     * Reset card to natural state
     */
    self.reset = function () {
      self.stopAudio();
      self.updateLabel(null, null, true); // Reset card label
      flippedState = false;
      removedState = false;
      $card[0].classList.remove('h5p-flipped', 'h5p-matched');
    };

    /**
     * Get card description.
     *
     * @returns {string}
     */
    self.getDescription = function () {
      return description;
    };

    /**
     * Get image clone.
     *
     * @returns {H5P.jQuery}
     */
    self.getImage = function () {
      return $card.find('img').clone();
    };

    /**
     * Append card to the given container.
     *
     * @param {H5P.jQuery} $container
     */
    self.appendTo = function ($container) {
      $wrapper = $('<li class="h5p-memory-wrap" tabindex="-1" role="button"><div class="h5p-memory-card">' +
                  '<div class="h5p-front"' + (styles && styles.front ? styles.front : '') + '>' + (styles && styles.backImage ? '' : '<span></span>') + '</div>' +
                  '<div class="h5p-back"' + (styles && styles.back ? styles.back : '') + '>' +
                    (path ? '<img src="' + path + '" alt="' + alt + '" style="width:' + width + ';height:' + height + '"/>' + (audioPlayer ? '<div class="h5p-memory-audio-button"></div>' : '') : '<i class="h5p-memory-audio-instead-of-image">') +
                  '</div>' +
                '</div></li>')
        .appendTo($container)
        .on('keydown', function (event) {
          switch (event.which) {
            case 13: // Enter
            case 32: // Space
              self.flip();
              event.preventDefault();
              return;
            case 39: // Right
            case 40: // Down
              // Move focus forward
              self.trigger('next');
              event.preventDefault();
              return;
            case 37: // Left
            case 38: // Up
              // Move focus back
              self.trigger('prev');
              event.preventDefault();
              return;
            case 35:
              // Move to last card
              self.trigger('last');
              event.preventDefault();
              return;
            case 36:
              // Move to first card
              self.trigger('first');
              event.preventDefault();
              return;
          }
        });

      $wrapper.attr('aria-label', l10n.cardPrefix.replace('%num', $wrapper.index() + 1) + ' ' + l10n.cardUnturned);
      $card = $wrapper.children('.h5p-memory-card')
        .children('.h5p-front')
          .click(function () {
            self.flip();
          })
          .end();

      if (audioPlayer) {
        $card.children('.h5p-back')
          .click(function () {
            if ($card.hasClass('h5p-memory-audio-playing')) {
              self.stopAudio();
            }
            else {
              audioPlayer.play();
            }
          })
      }
    };

    /**
     * Re-append to parent container.
     */
    self.reAppend = function () {
      var parent = $wrapper[0].parentElement;
      parent.appendChild($wrapper[0]);
    };

    /**
     * Make the card accessible when tabbing
     */
    self.makeTabbable = function () {
      if ($wrapper) {
        $wrapper.attr('tabindex', '0');
      }
    };

    /**
     * Prevent tabbing to the card
     */
    self.makeUntabbable = function () {
      if ($wrapper) {
        $wrapper.attr('tabindex', '-1');
      }
    };

    /**
     * Make card tabbable and move focus to it
     */
    self.setFocus = function () {
      self.makeTabbable();
      if ($wrapper) {
        $wrapper.focus();
      }
    };

    /**
     * Check if the card has been removed from the game, i.e. if has
     * been matched.
     */
    self.isRemoved = function () {
      return removedState;
    };

    /**
     * Stop any audio track that might be playing.
     */
    self.stopAudio = function () {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
      }
    };
  };

  // Extends the event dispatcher
  MemoryGame.Card.prototype = Object.create(EventDispatcher.prototype);
  MemoryGame.Card.prototype.constructor = MemoryGame.Card;

  /**
   * Check to see if the given object corresponds with the semantics for
   * a memory game card.
   *
   * @param {object} params
   * @returns {boolean}
   */
  MemoryGame.Card.isValid = function (params) {
    return (params !== undefined &&
             (params.image !== undefined &&
             params.image.path !== undefined) ||
           params.audio);
  };

  /**
   * Checks to see if the card parameters should create cards with different
   * images.
   *
   * @param {object} params
   * @returns {boolean}
   */
  MemoryGame.Card.hasTwoImages = function (params) {
    return (params !== undefined &&
             (params.match !== undefined &&
              params.match.path !== undefined) ||
           params.matchAudio);
  };

  /**
   * Determines the theme for how the cards should look
   *
   * @param {string} color The base color selected
   * @param {number} invertShades Factor used to invert shades in case of bad contrast
   */
  MemoryGame.Card.determineStyles = function (color, invertShades, backImage) {
    var styles =  {
      front: '',
      back: '',
      backImage: !!backImage
    };

    // Create color theme
    if (color) {
      var frontColor = shade(color, 43.75 * invertShades);
      var backColor = shade(color, 56.25 * invertShades);

      styles.front += 'color:' + color + ';' +
                      'background-color:' + frontColor + ';' +
                      'border-color:' + frontColor +';';
      styles.back += 'color:' + color + ';' +
                     'background-color:' + backColor + ';' +
                     'border-color:' + frontColor +';';
    }

    // Add back image for card
    if (backImage) {
      var backgroundImage = 'background-image:url(' + backImage + ')';

      styles.front += backgroundImage;
      styles.back += backgroundImage;
    }

    // Prep style attribute
    if (styles.front) {
      styles.front = ' style="' + styles.front + '"';
    }
    if (styles.back) {
      styles.back = ' style="' + styles.back + '"';
    }

    return styles;
  };

  /**
   * Convert hex color into shade depending on given percent
   *
   * @private
   * @param {string} color
   * @param {number} percent
   * @return {string} new color
   */
  var shade = function (color, percent) {
    var newColor = '#';

    // Determine if we should lighten or darken
    var max = (percent < 0 ? 0 : 255);

    // Always stay positive
    if (percent < 0) {
      percent *= -1;
    }
    percent /= 100;

    for (var i = 1; i < 6; i += 2) {
      // Grab channel and convert from hex to dec
      var channel = parseInt(color.substr(i, 2), 16);

      // Calculate new shade and convert back to hex
      channel = (Math.round((max - channel) * percent) + channel).toString(16);

      // Make sure to always use two digits
      newColor += (channel.length < 2 ? '0' + channel : channel);
    }

    return newColor;
  };

})(H5P.MemoryGame, H5P.EventDispatcher, H5P.jQuery);
;
(function (MemoryGame) {

  /**
   * Keeps track of the number of cards that has been turned
   *
   * @class H5P.MemoryGame.Counter
   * @param {H5P.jQuery} $container
   */
  MemoryGame.Counter = function ($container) {
    /** @alias H5P.MemoryGame.Counter# */
    var self = this;

    var current = 0;

    /**
     * @private
     */
    var update = function () {
      $container[0].innerText = current;
    };

    /**
     * Increment the counter.
     */
    self.increment = function () {
      current++;
      update();
    };

    /**
     * Revert counter back to its natural state
     */
    self.reset = function () {
      current = 0;
      update();
    };
  };

})(H5P.MemoryGame);
;
(function (MemoryGame, $) {

  /**
   * A dialog for reading the description of a card.
   *
   * @class H5P.MemoryGame.Popup
   * @param {H5P.jQuery} $container
   * @param {Object.<string, string>} l10n
   */
  MemoryGame.Popup = function ($container, l10n) {
    /** @alias H5P.MemoryGame.Popup# */
    var self = this;

    var closed;

    var $popup = $('<div class="h5p-memory-pop" role="dialog"><div class="h5p-memory-top"></div><div class="h5p-memory-desc h5p-programatically-focusable" tabindex="-1"></div><div class="h5p-memory-close" role="button" tabindex="0" title="' + (l10n.closeLabel || 'Close') + '" aria-label="' + (l10n.closeLabel || 'Close') + '"></div></div>').appendTo($container);
    var $desc = $popup.find('.h5p-memory-desc');
    var $top = $popup.find('.h5p-memory-top');

    // Hook up the close button
    $popup.find('.h5p-memory-close').on('click', function () {
      self.close(true);
    }).on('keypress', function (event) {
      if (event.which === 13 || event.which === 32) {
        self.close(true);
        event.preventDefault();
      }
    });

    /**
     * Show the popup.
     *
     * @param {string} desc
     * @param {H5P.jQuery[]} imgs
     * @param {function} done
     */
    self.show = function (desc, imgs, styles, done) {
      $desc.html(desc);
      $top.html('').toggleClass('h5p-memory-two-images', imgs.length > 1);
      for (var i = 0; i < imgs.length; i++) {
        $('<div class="h5p-memory-image"' + (styles ? styles : '') + '></div>').append(imgs[i]).appendTo($top);
      }
      $popup.show();
      $desc.focus();
      closed = done;
    };

    /**
     * Close the popup.
     *
     * @param {boolean} refocus Sets focus after closing the dialog
     */
    self.close = function (refocus) {
      if (closed !== undefined) {
        $popup.hide();
        closed(refocus);
        closed = undefined;
      }
    };

    /**
     * Sets popup size relative to the card size
     *
     * @param {number} fontSize
     */
    self.setSize = function (fontSize) {
      // Set image size
      $top[0].style.fontSize = fontSize + 'px';

      // Determine card size
      var cardSize = fontSize * 6.25; // From CSS

      // Set popup size
      $popup[0].style.minWidth = (cardSize * 2.5) + 'px';
      $popup[0].style.minHeight = cardSize + 'px';
    };
  };

})(H5P.MemoryGame, H5P.jQuery);
;
(function (MemoryGame, Timer) {

  /**
   * Adapter between memory game and H5P.Timer
   *
   * @class H5P.MemoryGame.Timer
   * @extends H5P.Timer
   * @param {Element} element
   */
  MemoryGame.Timer = function (element) {
    /** @alias H5P.MemoryGame.Timer# */
    var self = this;

    // Initialize event inheritance
    Timer.call(self, 100);

    /** @private {string} */
    var naturalState = element.innerText;

    /**
     * Set up callback for time updates.
     * Formats time stamp for humans.
     *
     * @private
     */
    var update = function () {
      var time = self.getTime();

      var minutes = Timer.extractTimeElement(time, 'minutes');
      var seconds = Timer.extractTimeElement(time, 'seconds') % 60;

      // Update duration attribute
      element.setAttribute('datetime', 'PT' + minutes + 'M' + seconds + 'S');

      // Add leading zero
      if (seconds < 10) {
        seconds = '0' + seconds;
      }

      element.innerText = minutes + ':' + seconds;
    };

    // Setup default behavior
    self.notify('every_tenth_second', update);
    self.on('reset', function () {
      element.innerText = naturalState;
      self.notify('every_tenth_second', update);
    });
  };

  // Inheritance
  MemoryGame.Timer.prototype = Object.create(Timer.prototype);
  MemoryGame.Timer.prototype.constructor = MemoryGame.Timer;

})(H5P.MemoryGame, H5P.Timer);
;
