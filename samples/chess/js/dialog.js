

Dialog = (function() {

  var registry_ = {};

  var activeDialog_ = null;

  function Dialog(name) {
    this.initialize(name);
  }

  function getElement(name) {
    return $(name + '-dialog');
  }

  Dialog.prototype = {

     name: null,

     dragFrom: null,

     initialize: function(name) {
       this.name = name;
       var element = getElement(name);
       // Add listeners for close and cancel.
       var closeButtons = element.getElementsByClassName('close-button');
       for (var i = 0; i < closeButtons.length; i++)
         closeButtons[i].addEventListener('click', this.close.bind(this));
       var cancelButtons = element.getElementsByClassName('cancel-button');
       for (var i = 0; i < cancelButtons.length; i++)
         cancelButtons[i].addEventListener('click', this.cancel.bind(this));

       var titleBar = element.getElementsByClassName('dialog-title')[0];
       if (titleBar)
         titleBar.addEventListener('mousedown', this.onMouseDown_.bind(this));
     },

     show: function() {
       Dialog.show(this.name);
     },

     close: function() {
       this.commit();
       Dialog.dismiss(this.name);
     },

     cancel: function() {
       Dialog.dismiss(this.name);
     },

     commit: function() {
       // Override for specific dialog to commit changes to the dialog before closing.
     },

     onMouseDown_: function(e) {
       this.dragFrom = {
         x: e.clientX,
         y: e.clientY
       };
       document.addEventListener('mouseup', this.onMouseUp_.bind(this));
       document.addEventListener('mousemove', this.onMouseMove_.bind(this));
       return false;
     },

     onMouseUp_: function(e) {
       if (this.dragFrom) {
         this.dragFrom = null;
         document.removeEventListener('mouseup', this.onMouseUp_);
         document.removeEventListener('mousemove', this.onMouseMove_);
         return false;
       }
       return true;
     },

     onMouseMove_: function(e) {
       if (this.dragFrom) {
         var dragTo = {
           x: e.clientX,
           y: e.clientY
         };
         var dx = dragTo.x - this.dragFrom.x;
         var dy = dragTo.y - this.dragFrom.y;
         this.dragFrom = dragTo;
         var dialog = getElement(this.name);
         var top = dialog.offsetTop + dy;
         var left = dialog.offsetLeft + dx;
         var bottom = top + dialog.clientHeight;
         var right = left + dialog.clientWidth;
         // Constrain to document bounds.
         if (bottom > document.body.clientHeight)
           top = document.body.clientHeight - dialog.clientHeight;
         // Back off the limit for the right edge of the dialog by the
         // width of the drop shadow to prevent possible layout changes.
         var limit = document.body.clientWidth - 5;
         if (right > limit)
           left = limit - dialog.clientWidth;
         if (top < 0)
           top = 0;
         if (left < 0)
           left = 0;
         dialog.style.left = left + 'px';
         dialog.style.top = top + 'px';
         return false;
       }
       return true;
     },

  }

  /**
   * Displays a popup dialog.
   * @param {string} name Registered name of the dialog.
   * @param {{x: number, y: number}=} opt_position  Optional position of the dialog.
   *     If not specified, the dialog is centered.
   */
  Dialog.show = function(name, opt_position) {
    console.log('show dialog ' + name);
    activeDialog_ = registry_[name];
    var element = getElement(name);
    element.classList.add('positioning');
    element.style.left = '50%';
    element.style.top = '50%';
    element.hidden = false;
    element.parentNode.hidden = false;
    var width = element.clientWidth;
    var height = element.clientHeight;
    var left = element.offsetLeft;
    var top = element.offsetTop;
    console.log('dialog ' + name + ' is ' + width + ' by ' + height);
    var position = opt_position ? opt_position :
        {x: Math.floor(left - width/2), 
         y: Math.floor(top - height/2)};
    element.style.left = position.x + 'px';
    element.style.top = position.y + 'px';
    element.classList.remove('positioning');
  }

  Dialog.dismiss = function(name) {
    console.log('dismiss dialog');
    var element = getElement(name);
    element.hidden = true;
    element.parentNode.hidden = true;
  }

  Dialog.register = function(name, dialog) {
    registry_[name] = dialog;
  }

  Dialog.getInstance = function(name) {
    return registry_[name];
  }

  Dialog.showInfoDialog = function(title, message) {
    var dialog = Dialog.getInstance('info');
    if (!dialog) {
       dialog = new InfoDialog();
       Dialog.register('info', dialog);
    }
    dialog.setTitle(title);
    dialog.setMessage(message);
    dialog.show();
  }

  Dialog.showConfirmDialog = function(title, message, callback) {
    // TODO: implement me.
  }

  Dialog.showPromotionDialog = function(square, callback) {
    var dialog = Dialog.getInstance('promotion');
    if (!dialog) {
       dialog = new PawnPromotionDialog();
       Dialog.register('promotion', dialog);
    }
    dialog.setSquare(square);
    dialog.setCallback(callback);
    dialog.show();
  }

  return Dialog;

})();

InfoDialog = function() {
  Dialog.apply(this, ['info']);
}

InfoDialog.prototype = {
  __proto__: Dialog.prototype,

  initialize: function(name) {
    Dialog.prototype.initialize.call(this, name);
  },

  setTitle: function(title) {
    $('info-dialog-title').textContent = title;
  },

  setMessage: function(message) {
    $('info-dialog-message').textContent = message;
  },
};

PawnPromotionDialog = function() {
  Dialog.apply(this, ['promotion']);
}

PawnPromotionDialog.prototype = {
  __proto__: Dialog.prototype,

  callback_: null,

  promotionSquare_: null,

  initialize: function(name) {
    Dialog.prototype.initialize.call(this, name);
    $('promotion-options').addEventListener(
        'click', this.onClick_.bind(this));
  },

  setSquare: function(square) {
    this.promotionSquare_ = square;
    var rank = parseInt(square.charAt(1));
    var color = (rank == 8) ? 'W' : 'B';
    var setPromotionPiece = function(position, type) {
      var element = $(position);
      while (position.firstChild != null) {
        position.removeCHild(position.firstChild);
      }
      var piece = document.createElement('div');
      piece.className = color + type;
      element.appendChild(piece);
    }
    setPromotionPiece('queen-promotion', 'Q');
    setPromotionPiece('rook-promotion', 'R');
    setPromotionPiece('bishop-promotion', 'B');
    setPromotionPiece('knight-promotion', 'N');
  },

  setCallback: function(callback) {
    this.callback_ = callback;
  },

  onClick_: function(event) {
    var target = event.target;
    var className = target.className;
    var pieceType = className.charAt(1);
    if (className.charAt(0) == 'W')
      pieceType = pieceType.toLowerCase();
    this.callback_(this.promotionSquare_, pieceType);
    event.stopPropagation();
    event.preventDefault();
    this.cancel();
  }
};

