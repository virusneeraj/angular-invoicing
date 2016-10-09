angular.module('invoicing', [])

// The default logo for the invoice
.constant('DEFAULT_LOGO', 'images/metaware_logo.png')

// The invoice displayed when the user first uses the app
.constant('DEFAULT_INVOICE', {
  tax: 13.00,
  invoice_number: 10,
  customer_info: {
    name: 'Mr. John Doe',
    web_link: 'John Doe Designs Inc.',
    address1: '1 Infinite Loop',
    address2: 'Cupertino, California, US',
    postal: '90210'
  },
  company_info: {
    name: 'Metaware Labs',
    web_link: 'www.metawarelabs.com',
    address1: '123 Yonge Street',
    address2: 'Toronto, ON, Canada',
    postal: 'M5S 1B6'
  },
  items:[
    { qty: 10, description: 'Gadget', cost: 9.95 }
  ]
})

// Service for accessing local storage
.service('LocalStorage', [function() {

  var Service = {};

  // Returns true if there is a logo stored
  var hasLogo = function() {
    return !!localStorage['logo'];
  };

  // Returns a stored logo (false if none is stored)
  Service.getLogo = function() {
    if (hasLogo()) {
      return localStorage['logo'];
    } else {
      return false;
    }
  };

  Service.setLogo = function(logo) {
    localStorage['logo'] = logo;
  };

  // Checks to see if an invoice is stored
  var hasInvoice = function() {
    return !(localStorage['invoice'] == '' || localStorage['invoice'] == null);
  };

  // Returns a stored invoice (false if none is stored)
  Service.getInvoice = function() {
    if (hasInvoice()) {
      return JSON.parse(localStorage['invoice']);
    } else {
      return false;
    }
  };

  Service.setInvoice = function(invoice) {
    localStorage['invoice'] = JSON.stringify(invoice);
  };

  // Clears a stored logo
  Service.clearLogo = function() {
    localStorage['logo'] = '';
  };

  // Clears a stored invoice
  Service.clearinvoice = function() {
    localStorage['invoice'] = '';
  };

  // Clears all local storage
  Service.clear = function() {
    localStorage['invoice'] = '';
    Service.clearLogo();
  };

  return Service;

}])

.service('Currency', [function(){

  var service = {};

  service.all = function() {
    return [
      {
        name: 'Indian Rupee (₹)',
        symbol: '₹'
      },
      {
        name: 'British Pound (£)',
        symbol: '£'
      },
      {
        name: 'Canadian Dollar ($)',
        symbol: 'CAD $ '
      },
      {
        name: 'Euro (€)',
        symbol: '€'
      },
      {
        name: 'Norwegian krone (kr)',
        symbol: 'kr '
      },
      {
        name: 'US Dollar ($)',
        symbol: '$'
      }
    ]
  }

  return service;
  
}])

// Main application controller
.controller('InvoiceCtrl', ['$scope', '$http', 'DEFAULT_INVOICE', 'DEFAULT_LOGO', 'LocalStorage', 'Currency',
  function($scope, $http, DEFAULT_INVOICE, DEFAULT_LOGO, LocalStorage, Currency) {

    ////num to words//

    $scope.numToWords = function (number) {

      //Validates the number input and makes it a string
      number = Math.round(number ) ;

      if (typeof number === 'string') {
        number = parseInt(number, 10);
      }
      if (typeof number === 'number' && !isNaN(number) && isFinite(number)) {
        number = number.toString(10);
      }
      else {
        return 'This is not a valid number';
      }

      //Creates an array with the number's digits and
      //adds the necessary amount of 0 to make it fully
      //divisible by 3
      var digits = number.split('');
      var digitsNeeded = 3 - digits.length % 3;
      if (digitsNeeded !== 3) { //prevents this : (123) ---> (000123)
        while (digitsNeeded > 0) {
          digits.unshift('0');
          digitsNeeded--;
        }
      }

      //Groups the digits in groups of three
      var digitsGroup = [];
      var numberOfGroups = digits.length / 3;
      for (var i = 0; i < numberOfGroups; i++) {
        digitsGroup[i] = digits.splice(0, 3);
      }
      console.log(digitsGroup) //debug

      //Change the group's numerical values to text
      var digitsGroupLen = digitsGroup.length;
      var numTxt = [
        [null,'one','two','three','four','five','six','seven','eight','nine'], //hundreds
        [null, 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'], //tens
        [null,'one','two','three','four','five','six','seven','eight','nine'] //ones
      ];
      var tenthsDifferent = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']

      // j maps the groups in the digitsGroup
      // k maps the element's position in the group to the numTxt equivalent
      // k values: 0 = hundreds, 1 = tens, 2 = ones
      for (var j = 0; j < digitsGroupLen; j++) {
        for (var k = 0; k < 3; k++) {
          var currentValue = digitsGroup[j][k];
          digitsGroup[j][k] = numTxt[k][currentValue]
          if (k === 0 && currentValue !== '0') { // !==0 avoids creating a string "null hundred"
            digitsGroup[j][k] += ' hundred ';
          }
          else if (k === 1 && currentValue === '1') { //Changes the value in the tens place and erases the value in the ones place
            digitsGroup[j][k] = tenthsDifferent[digitsGroup[j][2]];
            digitsGroup[j][2] = 0; //Sets to null. Because it sets the next k to be evaluated, setting this to null doesn't work.
          }
        }
      }

      console.log(digitsGroup) //debug

      //Adds '-' for grammar, cleans all null values, joins the group's elements into a string
      for (var l = 0; l < digitsGroupLen; l++) {
        if (digitsGroup[l][1] && digitsGroup[l][2]) {
          digitsGroup[l][1] += '-';
        }
        digitsGroup[l].filter(function (e) {return e !== null});
        digitsGroup[l] = digitsGroup[l].join('');
      }

      console.log(digitsGroup) //debug

      //Adds thousand, millions, billion and etc to the respective string.
      var posfix = [null,'thousand','million','billion','trillion','quadrillion','quintillion','sextillion'];
      if (digitsGroupLen > 1) {
        var posfixRange = posfix.splice(0, digitsGroupLen).reverse();
        for (var m = 0; m < digitsGroupLen - 1; m++) { //'-1' prevents adding a null posfix to the last group
          if(digitsGroup[m]){ // avoids 10000000 being read (one billion million)
            digitsGroup[m] += ' ' + posfixRange[m];
          }
        }
      }

      console.log(digitsGroup) //debug

      //Joins all the string into one and returns it
      return digitsGroup.join(' ')+' only';

    }; //End of numToWords function

   // var words = numToWords(1234);
   // alert(words);

    /////////////////

  // Set defaults
  $scope.currencySymbol = '₹';
  $scope.logoRemoved = false;
  $scope.printMode   = false;

  (function init() {
    // Attempt to load invoice from local storage
    !function() {
      var invoice = LocalStorage.getInvoice();
      $scope.invoice = invoice ? invoice : DEFAULT_INVOICE;
    }();

    // Set logo to the one from local storage or use default
    !function() {
      var logo = LocalStorage.getLogo();
      $scope.logo = logo ? logo : DEFAULT_LOGO;
    }();

    $scope.availableCurrencies = Currency.all();

  })()
  // Adds an item to the invoice's items
  $scope.addItem = function() {
    $scope.invoice.items.push({ qty:0, cost:0, description:"" });
  }

  // Toggle's the logo
  $scope.toggleLogo = function(element) {
    $scope.logoRemoved = !$scope.logoRemoved;
    LocalStorage.clearLogo();
  };

  // Triggers the logo chooser click event
  $scope.editLogo = function() {
    // angular.element('#imgInp').trigger('click');
    document.getElementById('imgInp').click();
  };

  $scope.printInfo = function() {
    window.print();
  };

  // Remotes an item from the invoice
  $scope.removeItem = function(item) {
    $scope.invoice.items.splice($scope.invoice.items.indexOf(item), 1);
  };

  // Calculates the sub total of the invoice
  $scope.invoiceSubTotal = function() {
    var total = 0.00;
    angular.forEach($scope.invoice.items, function(item, key){
      total += (item.qty * item.cost);
    });
    return total;
  };

  // Calculates the tax of the invoice
  $scope.calculateTax = function() {
    return (($scope.invoice.tax * $scope.invoiceSubTotal())/100);
  };

  // Calculates the grand total of the invoice
  $scope.calculateGrandTotal = function() {
    saveInvoice();
    return $scope.calculateTax() + $scope.invoiceSubTotal();
  };

  // Clears the local storage
  $scope.clearLocalStorage = function() {
    var confirmClear = confirm('Are you sure you would like to clear the invoice?');
    if(confirmClear) {
      LocalStorage.clear();
      setInvoice(DEFAULT_INVOICE);
    }
  };

  // Sets the current invoice to the given one
  var setInvoice = function(invoice) {
    $scope.invoice = invoice;
    saveInvoice();
  };

  // Reads a url
  var readUrl = function(input) {
    if (input.files && input.files[0]) {
      var reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById('company_logo').setAttribute('src', e.target.result);
        LocalStorage.setLogo(e.target.result);
      }
      reader.readAsDataURL(input.files[0]);
    }
  };

  // Saves the invoice in local storage
  var saveInvoice = function() {
    LocalStorage.setInvoice($scope.invoice);
  };

  // Runs on document.ready
  angular.element(document).ready(function () {
    // Set focus
    document.getElementById('invoice-number').focus();

    // Changes the logo whenever the input changes
    document.getElementById('imgInp').onchange = function() {
      readUrl(this);
    };
  });




}])
