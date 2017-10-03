function getResults(form) {

// inputs from form to be variables uses in analysis
var years = form.holdPeriod.value,
    purchasePrice = form.purchasePrice.value,
    costs = form.purchaseCosts.value,
    salePrice = form.salePrice.value,
    saleCosts = form.saleCosts.value,
    initialEBITDA = form.initialEBITDA.value,
    timingTypeEntry = form.timingTypeEntry.value,
    initialCapitalOther = form.initialCapitalOther.value,
    EBITDAGrowthRate = parseFloat(form.annualGrowthRate.value) || 0,
    capitalOtherCostRate = parseFloat(form.annualCapitalOtherCostChange.value) || 0,
    financingAmount = form.financingAmount.value,
    financingType = form.financingType.value,
    interestRate = form.interestRate.value || .05, // set default value to .05 in case user enters debt amount with no rate
    presentationDecimals = form.presentationDecimals.value,
    IRRTypeEntry = form.IRRTypeEntry.value

//headers for presentation table
function MakeHeaders (years) {
    var headers = []
    for (var i = 0; i <= years; i++) {
    headers.push("Year " + i)
  }
   headers[0] = "Entry"
   headers.push("Exit")
  return headers
}

//dates for XIRR function
function makeDates (array) {
   newArray = []
   newArray[0] = new Date()
   newArray[0].setFullYear(2017, 11, 31)
   for (var i = 1; i < array.length - 1; i++) {
    newArray[i] = new Date()
    newArray[i].setFullYear(2017+i, 05, 30)
   }
   var exitDate = new Date()
   exitDate.setFullYear(2017+(array.length-2), 11, 31)
   newArray.push(exitDate)
   return newArray
}

//to add cash flow arrays for rollup
Array.prototype.SumArray = function (array) {
    var sum = [];
    if (array != null && this.length == array.length) {
        for (var i = 0; i < array.length; i++) {
            sum.push(this[i] + array[i]);
        }
    }
    return sum;
}

//take input and makes array of numbers for financial analysis.  Used for EBITDA and other cash flows.
function MakeArray (initialCF, growthRate, years, timingTypeEntry = "Forward") {
    var output = []
    if (timingTypeEntry === "Current") {
         for (var i = 1; i <= years; i++) {
            var current = initialCF * (Math.pow((1 + growthRate), i))
            output.push(current)
         }
      } else {
        for (var i = 0; i < years; i++) {
           var current = initialCF * (Math.pow((1 + growthRate), i))
           output.push(current)
        }
      }
  return output
  }

//for cash flows with entry / exit values and what returns are based upon
function MakeTotalArray (entry, cfs, exit) {
     var output = []
       output.push(-Math.abs(entry))
        cfs.forEach(function (i) {
          output.push(i)
        })
       output.push(Math.abs(exit))
     return output
  }

//seperate due to different signs upon entry / exit
  function MakeTotalDebtArray (entry, cfs, exit) {
       var output = []
         output.push(Math.abs(entry))
          cfs.forEach(function (i) {
            output.push(i)
          })
         output.push(-Math.abs(exit))
       return output
    }

//first set of working functions (to move to seperate file)
var headers = MakeHeaders(years)
var UnlevereagedEntry = Math.abs(purchasePrice) + Math.abs(costs) // sign does not matter b/c function makes negative no matter what
var UnleveragedExit = Math.abs(salePrice) - (Math.abs(salePrice) * Math.abs(saleCosts))  // same sign comment as above
var EBITDAs = MakeArray(initialEBITDA, EBITDAGrowthRate, years, timingTypeEntry)
var capitalOtherCosts = MakeArray(initialCapitalOther, capitalOtherCostRate, years)
var unleveragedCFs = EBITDAs.SumArray(capitalOtherCosts)
var totalUnleveragedCFs = MakeTotalArray (UnlevereagedEntry, unleveragedCFs, UnleveragedExit)

//debt support. calculatese annaua payment.  to use for check once built
function AnnualPMT (interestRate, financingAmount, numberOfPayments = 360) {
   return 12*(-(Math.abs(financingAmount)) * (interestRate/12)/(1-Math.pow(1 + interestRate/12, -numberOfPayments)));
}

//debt typically calculcated monthly to be more precise.  alternative payment calculation could be used - 360/365
function MonthlyPMT (interestRate, financingAmount, numberOfPayments = 360, financingType = "Amortizing") {
   if(interestRate == "null" || interestRate == 0 || financingAmount == 0) {
     return 0
   } else if (financingType == "Interest Only") {
      return((Math.abs(financingAmount)) * (interestRate/12))
   } else {
   return ((Math.abs(financingAmount)) * (interestRate/12)/(1-Math.pow(1 + interestRate/12, -numberOfPayments)));
}}

//builds debt schedule with monthly details - time period, principal payment, interest payment, and ending balance. Note: looked at multiple examples.
function MakeDebtSchedule(interestRate, financingAmount, numberOfPayments = 360, monthlyPay) {
   var output = []
   var remainingBalance = financingAmount
   var totalPayments = numberOfPayments

for (var i = 1; i<=totalPayments; i++) {
   var interestPayment = remainingBalance *( interestRate/12)
   var principalPayment = Math.abs(monthlyPay) - Math.abs(interestPayment)
   remainingBalance -= principalPayment
   var row =  [i, principalPayment > 0 ? principalPayment : 0, interestPayment > 0 ? interestPayment : 0, remainingBalance > 0 ?remainingBalance : 0];
   output.push(row)
   }
return output
}

//doing returns and presentation on annual basis so need to roll up monthly calculations
function AnnualDebtSchedule(array, years) {
 var annualDebtCFs = []
for (var j = 1; j <= years; j++) {
  var beg = (j - 1) * 12
  var end = j * 12
  var workingArray = array.slice(beg, end)
  var interestRollUp = 0
  var principalRollup = 0
 for (var i = 0; i < workingArray.length; i++) {
    interestRollUp += workingArray[i][2]
    principalRollup += workingArray[i][1]
    var endingBalance = workingArray[workingArray.length-1][3]
    var row = [j, principalRollup, interestRollUp, endingBalance]
    }
 annualDebtCFs.push(row)
}
return annualDebtCFs
}

//create just interest payment array - presentation
function InterestCFs(array) {
   var intCFs = []
   for (var i = 0; i < array.length; i++) {
    intCFs.push(-array[i][2])
    }
return intCFs
}

//create principal payment array - presentation - could combine with above and make more dynamic
function PrincipalCFs(array) {
   var principalCFs = []
   for (var i = 0; i < array.length; i++) {
    principalCFs.push(-array[i][1])
    }
return principalCFs
}

//second set of working functions (to move to seperate file).  Get debt specifics and then build out total cash flows
var monthlyPayment = MonthlyPMT (interestRate, financingAmount, 360, financingType)
var debtSchedule = MakeDebtSchedule(interestRate, financingAmount, 360, monthlyPayment)
var annualDebtSchedule = AnnualDebtSchedule(debtSchedule, years)
var interestPayments = InterestCFs(annualDebtSchedule)
var principalPayments = PrincipalCFs(annualDebtSchedule)
var exitBalance = annualDebtSchedule[years-1][3]
var debtPayments = interestPayments.SumArray(principalPayments)
var totalDebtPayments = MakeTotalDebtArray(financingAmount, debtPayments, exitBalance)
var leveragedCFs = unleveragedCFs.SumArray(debtPayments)
var equityEntry = Math.abs(purchasePrice) + Math.abs(costs) - Math.abs(financingAmount) // sign does not matter b/c function makes negative no matter what
var equityExit = Math.abs(salePrice) - (Math.abs(salePrice) * Math.abs(saleCosts) - Math.abs(exitBalance))  // same sign comment as above
var totalLeveragedCFs = totalUnleveragedCFs.SumArray(totalDebtPayments)


//source: essamjoubori/finance.js
function seekZero(fn) {
  var x = 1;
  while (fn(x) > 0) {
    x += 1;
  }
  while (fn(x) < 0) {
    x -= 0.01
  }
  return x + 0.01;
}

//math for basic IRR.  Almost exactly based upon essamjoubori/finance.js. Changed to fit format of this model.
function IRR(array) {
   var tries = 1
   var positive
   var negative
  for (var i = 0; i < array.length; i++) {
  var test = array.slice(i, i+1)
  if (test > 0) positive = true;
  if (test < 0) negative = true;
}
  if(!positive || !negative) throw new Error(`IRR requires at least one positive and one negative value`);
  function npv(rate) {
   tries ++;
  if (tries > 1000) {
   throw new Error(`IRR cannot find a result`);
  }
   var rrate = (1 + rate/100);
   var npv = array[0];
   for (var i = 1; i < array.length; i++) {
     npv += (array[i] / Math.pow(rrate, i))
   }
  return npv
}
  return Math.round(seekZero(npv) * 100)/ 100;
}

//Math for XIRR, which takes timing of cash flows into account. Based upon essamjoubori/finance.js.
function findXirr(cfs, dts, guess) {
  if (cfs.length != dts.length) throw new Error("Number of cash flows and dates needs to match");

var positive, negative;
  for (var i = 0; i < cfs.length; i++) {
  var test = cfs.slice(i, i+1)
  if (test > 0) positive = true;
  if (test < 0) negative = true;
}
  if(!positive || !negative) throw new Error(`XIRR requires at least one positive and one negative value`);

guess = !!guess ? guess : 0;

var limit = 100;
var guess_last;
var durs = [];

durs.push(0);

for (var i = 1; i < dts.length; i++) {
  durs.push(durYear(dts[0], dts[i]))
}

do {
  guess_last = guess;
  guess = guess_last - sumEq(cfs, durs, guess_last);
  limit--;

}while(guess_last.toFixed(5) != guess.toFixed(5) && limit > 0);

var xirr = guess_last.toFixed(5) != guess.toFixed(5) ? null : guess*100;

return Math.round(xirr * 100) / 100;
};

//support function for  XIRR. Based upon essamjoubori/finance.js.
function sumEq(cfs, durs, guess) {
  var sum_fx = 0;
  var sum_fdx = 0;
  for (var i = 0; i < cfs.length; i++) {
     sum_fx = sum_fx + (cfs[i] / Math.pow(1 + guess, durs[i]));
  }
  for ( i = 0; i < cfs.length; i++) {
     sum_fdx = sum_fdx + (-cfs[i] * durs[i] * Math.pow(1 + guess, -1 - durs[i]))
  }
  return sum_fx / sum_fdx;
}

//support function for  XIRR. Based upon essamjoubori/finance.js.
function durYear(first, last) {
  return (Math.abs(last.getTime() - first.getTime()) / (1000 *3600 *24 *365));
}

//for implied entry and exit multiples, also for checks later
function multipleCreate(value, cf){
  if (value / cf < 0 || Number.isNaN(value / cf))
    return "NM"
  else return Math.round(value/cf * 100) / 100
}

//support for exit multiple
function finalItem(array) {
  return array[array.length-1]
}

//for outputs, want to know overall CAGR
function CAGR (array) {
    var beg = array[0],
        end = array[array.length-1],
    periods = array.length - 1,
       CAGR = Math.pow((end / beg), 1 / periods) - 1;
     return Math.round(CAGR * 10000) / 100;
}

//for output - total net cash flows received by investor divided by total entry equity
function equityMultiple(array) {
  var workingArray = array.slice(1)
  var sumOfArray = workingArray.reduce(function(accumulator, currentValue) {
 return accumulator + currentValue
})
 return sumOfArray / equityEntry
}

//support for IRR function - have final annual cash flow and terminal payment on same date.  Presented as seperate for easier review.  IRR only. XIRR requires seperate.
function comboEnd (array) {
   var newArray = []
   var a = array.slice(array.length-1)[0]
   var b = array.slice(array.length-2, array.length-1)[0]
   var c = a + b;
  for (var i = 0; i < array.length - 2; i++) {
     newArray.push(array[i])
  }
    newArray.push(c)
   return newArray
}

//third set of working functions (to move to seperate file).  Get IRRs, XIRRs, multiples, CAGRs
var totalUnleveragedCFsforIRR = comboEnd(totalUnleveragedCFs)
var totalLeveragedCFsforIRR = comboEnd(totalLeveragedCFs)


var finalEBITDA = finalItem(EBITDAs)
var impliedFutureEBITDA = finalEBITDA * (1 + EBITDAGrowthRate)
var currentEBITDA = (timingTypeEntry == "Current") ? initialEBITDA : 0
var forwardEBITDA = (timingTypeEntry == "Current") ? (initialEBITDA * (1 + EBITDAGrowthRate )) : initialEBITDA

var dateArray = makeDates(headers)
var unleveragedRegIRR = IRR(totalUnleveragedCFsforIRR)
var leveragedRegIRR = IRR(totalLeveragedCFsforIRR)
var unleveragedXIRR = findXirr(totalUnleveragedCFs, dateArray)
var leveragedXIRR = findXirr(totalLeveragedCFs, dateArray)

var unleveragedIRR = (IRRTypeEntry == "IRR") ? unleveragedRegIRR : unleveragedXIRR
var leveragedIRR = (IRRTypeEntry == "IRR") ? leveragedRegIRR : leveragedXIRR

var multipleOnEquity = equityMultiple(totalLeveragedCFs)
var CurrentEntryMultiple = multipleCreate(purchasePrice, currentEBITDA)
var ForwardEntryMultiple = multipleCreate(purchasePrice, forwardEBITDA)
var ExitMultiple = multipleCreate(salePrice, finalEBITDA)
var ImpliedForwardExitMultiple = multipleCreate(salePrice, impliedFutureEBITDA)
var eBITDACAGR = CAGR(EBITDAs)
var unleveragedCFsCAGR = CAGR(unleveragedCFs)
var leveragedCFsCAGR = CAGR(leveragedCFs)

//takes arrays with numbers and produces strings with specific format - "-" for zeros, and currency without dollar signs.  Got locale string information from https://developer.mozilla.org and W3 schools.
function arrayPresentation(array, decimals) {
     var output = []
     var sumOfArray = array.reduce(function(accumulator, currentValue) {
    return accumulator + currentValue
  })
     if (sumOfArray != 0) {
     array.map(function(item) {
     output.push(item.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
        }))
     })
   } else {
     for (i = 0; i < array.length; i++) {
       output.push("-")
       }
     }
   return output
}

//want a few major rows (top and total CFs) to have dollar signs and show zeros if no cash flows
function arrayDollarPresentation(array, decimals) {
     var output = []
     array.map(function(item) {
     output.push(item.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        style: "currency",
        currency: "USD"}))
     })
    return output
}

//convert one percentage to string, show "-" if zero
function percentagePresentation(item, decimals) {
    var output = []
    if (Number.isNaN(item)) {
      output.push("-")
    } else {
    output.push(item.toFixed(decimals)+"%")
      }
    return output
}

//convert % to whole number amount, show "-" if zero, should be able to combine with above and below
function growthArray(array) {
    var output = []
    for (var i = 1; i < array.length; i++) {
       var growth = (array[i] / array[i - 1] -1) *100
       output.push(growth)
    }
   return output
}

//convert whole number into string.  should be able to combine with both above
function growthArrayPresentation(array, decimals) {
     var output = []
     array.map(function(item) {
     output.push(item.toFixed(decimals)+"%")
     })
     for (i = 0; i < output.length; i++) {
       if (output[i] == "NaN%")
       output[i] = "-"
     }
   return output
}

//multiple presentation - convert number to string with "x" at end
function multiplePresentation(item, decimals) {
    var output = []
    if (item == "NA" || item == "NM" || item == "Infinity") {
      output.push("-")
    } else {
    output.push(item.toFixed(decimals)+"x")
  }
    return output
}

//for presentation, want to show any negative values with "()"versus "-"
function makeParentheses(array) {
newArray = []
for (var i = 0; i < array.length; i++) {
  var string = array[i]
  string = (string.charAt(0) == "-" && string.length > 1) ? "(" + string.substring(1) + ")" : string
  newArray.push(string)
}
return newArray
}


//forth set of working functions (to move to seperate file).  creates presentation ready inputs
var EBITDAGrowthArray = growthArray(EBITDAs)
var capitalOtherCostsGrowthArray = growthArray(capitalOtherCosts)
var unleveragedCFsGrowthArray = growthArray(unleveragedCFs)
var leveragedCFsGrowthArray = growthArray(leveragedCFs)

var presEBITDA = makeParentheses(arrayDollarPresentation(EBITDAs, presentationDecimals))
var presEBITDAGowthArray = makeParentheses(growthArrayPresentation(EBITDAGrowthArray, presentationDecimals))
var presCapitalOtherCosts = makeParentheses(arrayPresentation(capitalOtherCosts, presentationDecimals))
var presCapitalOtherCostsGrowthArray = makeParentheses(growthArrayPresentation(capitalOtherCostsGrowthArray, presentationDecimals))
var presUnleveragedCFs = makeParentheses(arrayPresentation(unleveragedCFs, presentationDecimals))
var presUnleveragedCFsGrowthArray = makeParentheses(growthArrayPresentation(unleveragedCFsGrowthArray, presentationDecimals))
var presTotalUnleveragedCFs = makeParentheses(arrayDollarPresentation(totalUnleveragedCFs, presentationDecimals))
var presUnleveragedIRR = makeParentheses(percentagePresentation(unleveragedIRR, presentationDecimals))
var presInterestPayments = makeParentheses(arrayPresentation(interestPayments, presentationDecimals))
var presPrincipalPayments = makeParentheses(arrayPresentation(principalPayments, presentationDecimals))
var presTotalDebtPayments = makeParentheses(arrayPresentation(totalDebtPayments, presentationDecimals))
var presLeveragedCFs = makeParentheses(arrayPresentation(leveragedCFs, presentationDecimals))
var presLeveragedCFsGrowthArray = makeParentheses(growthArrayPresentation(leveragedCFsGrowthArray, presentationDecimals))
var presTotalLeveragedCFs = makeParentheses(arrayDollarPresentation(totalLeveragedCFs, presentationDecimals))
var presLeveragedIRR = makeParentheses(percentagePresentation(leveragedIRR, presentationDecimals))
var presMultipleOnEquity = makeParentheses(multiplePresentation(multipleOnEquity, presentationDecimals))

var presCurrentEntryMultiple = multiplePresentation(CurrentEntryMultiple, presentationDecimals)
var presForwardEntryMultiple = multiplePresentation(ForwardEntryMultiple, presentationDecimals)
var presExitMultiple = multiplePresentation(ExitMultiple, presentationDecimals)
var presImpliedForwardExitMultiple = multiplePresentation(ImpliedForwardExitMultiple, presentationDecimals)

var presEBITDACAGR = makeParentheses(percentagePresentation(eBITDACAGR, presentationDecimals))
var presUnleveragedCFsCAGR = makeParentheses(percentagePresentation(unleveragedCFsCAGR, presentationDecimals))
var presLeveragedCFsCAGR = makeParentheses(percentagePresentation(leveragedCFsCAGR, presentationDecimals))

//for output table.  Make all of the presentation arrays the same length.  Based on the way they are set up, there are 4 different lengths the arrays might be in.  This is specific to how that relates to the final table. ie.  Growth arrays will be one shorter than cash flows. Therefore, there should be an empty cell added to the beginning.
function makeEqualLength(array, size) {
   var output = []
   var dif = size - array.length
   switch (dif) {
     case 0:
       output = array;
       return output
     case 1:
       output = array
       output.unshift(" ")
       return output
     case 2:
       output = array
       output.unshift(" ")
       output.push(" ")
       return output
     case 3:
       output = array
       output.unshift(" "," ")
       output.push(" ")
       return output
     default:
       output = array
       for (var i = 0; i < dif; i++) {
             output.push(" ")
       }
       return output
  }
}

//working variables to combine data into major output table.  Want this to be more dynamic
var size = headers.length
var toPrint = [headers, presEBITDA, presEBITDAGowthArray, presCapitalOtherCosts, presCapitalOtherCostsGrowthArray, presUnleveragedCFs, presUnleveragedCFsGrowthArray, presTotalUnleveragedCFs, presUnleveragedIRR, presInterestPayments, presPrincipalPayments, presTotalDebtPayments, presLeveragedCFs, presLeveragedCFsGrowthArray, presTotalLeveragedCFs, presLeveragedIRR, presMultipleOnEquity]

//takes all the arrays within one array to make equal length at one turn
function allMakeEqual(array) {
    var output = []
    for(i = 0; i < array.length; i++) {
        var each = makeEqualLength(array[i], size)
        output.push(each)
    }
   return output
}

//working variable, creates output table
var printedPrep = allMakeEqual(toPrint)

//if timing is one or two years, one item arrays were not spacing correctly so had back-end adjustment.  This formula corrects for that on those specific rows only.  Will need to be more dynamic
function spacingCorrect(array) {
if (size == 3 || size == 4) {

function getDataToFront (array) {
   if (array[0] == " ") {
     array.shift()
   }
   if (array[0] == " ") {
     array.shift()
   }
  return array
}

function addToEnd (array, length) {
   var dif = length - array.length
   if (dif == 1) {
     array.push(" ")
   }
   if (dif == 2) {
     array.push(" ")
     array.push(" ")
   }
    return array
 }

  var row1 = array[8]
  var row2 = array[15]
  var row3 = array[16]
  var length = size

  var workingRow1 = getDataToFront(row1)
  var workingRow2 = getDataToFront(row2)
  var workingRow3 = getDataToFront(row3)

  var adjustedRow1 = addToEnd(workingRow1, length)
  var adjustedRow2 = addToEnd(workingRow2, length)
  var adjustedRow3 = addToEnd(workingRow3, length)

 array[8] = adjustedRow1
 array[15] = adjustedRow2
 array[16] = adjustedRow3

 return array
 } else {
   return array
 }
}

//working variables
var printed = spacingCorrect(printedPrep)
var titles = ["", "EBITDA","Annual Growth", "Net Other Rev, Exp, Taxes, Capital", "Annual Growth", "Unleveraged Cash Flows", "Annual Growth", "Total Unleveraged Cash Flows", "Unleveraged IRR", "Interest Payments", "Principal Payments", "Total Debt Payments", "Leveraged Cash Flows", "Annual Growth", "Total Leveraged Cash Flows", "Leveraged IRR", "Multiple On Equity"]

//with spacing for all cash flows completed, need to add titles to the table for presentation
Array.prototype.AddTitles = function(array) {
  var output = [];
    if (array != null && this.length == array.length) {
       for (var i = 0; i < array.length; i++) {
          var workArray = this[i].slice(0)
          workArray.unshift(array[i])
          output.push(workArray);
      }
    }
  return output;
}

var printedWithTitles = printed.AddTitles(titles)

//have a placeholder in HTML so want to clear that prior to applying outputs.  Also enables refresh if update one of the inputs and hit submit again.
function clearTable() {
  var table = document.getElementById('outputTable')
  var rowCount =table.rows.length
  for (var i = rowCount - 1; i > 0; i--) {
      table.deleteRow(i);
     }
  table.deleteTHead()
  table.createTHead().setAttribute("id", "outputTableHeader")
    }

//makes table wih based upon an array of arrays. Sources included: css-tricks, stackoverflow examples, w3 school, MDN
function makeTable(array) {
    var table = document.getElementById('outputTable')
    var tableHeader = document.getElementById('outputTableHeader')
    var headerRow = document.createElement('tr')
    for (var j = 0; j < array[0].length; j++) {
       var cell = document.createElement('td');
        cell.textContent = array[0][j];
        headerRow.appendChild(cell);
    }
        outputTableHeader.appendChild(headerRow)
    var tableBody = document.getElementById('outputTableBody')
      for (var i = 1; i < array.length; i++) {
        var row = document.createElement('tr')
           for (var j = 0; j < array[i].length; j++) {
              var cell = document.createElement('td');
               cell.textContent = array[i][j];
               row.appendChild(cell);
           }
          outputTableBody.appendChild(row);
     }
    return table
}

//formats table for growth lines, IRRs.  Sources included: css-tricks, stackoverflow examples, w3 schools, MDN
function formatTable() {
   var rows = document.getElementById("outputTable").getElementsByTagName("tr")
   for (var i = 0; i < rows.length; i++) {
    if (document.getElementById("outputTable").getElementsByTagName("tr")[i].firstElementChild.innerHTML == "Annual Growth") {
   document.getElementById("outputTable").getElementsByTagName("tr")[i].style.fontStyle = "italic"
   document.getElementById("outputTable").getElementsByTagName("tr")[i].style.fontSize = "smaller"
    }
  }
  for (var i = 0; i < rows.length; i++) {
   if (document.getElementById("outputTable").getElementsByTagName("tr")[i].firstElementChild.innerHTML == "Unleveraged IRR"  || document.getElementById("outputTable").getElementsByTagName("tr")[i].firstElementChild.innerHTML == "Leveraged IRR" || document.getElementById("outputTable").getElementsByTagName("tr")[i].firstElementChild.innerHTML == "Multiple On Equity"){
     var cellOne = document.getElementById("outputTable").getElementsByTagName("tr")[i].firstElementChild
     var cellTwo = document.getElementById("outputTable").getElementsByTagName("tr")[i].childNodes[1]
        cellOne.style.backgroundColor = "#314566"
        cellTwo.style.backgroundColor = "#314566"
        cellOne.style.color = "white"
        cellTwo.style.color = "white"
        cellOne.style.borderTop = "medium solid #000000"
        cellTwo.style.borderTop = "medium solid #000000"
        cellOne.style.borderBottom = "medium solid #000000"
        cellTwo.style.borderBottom = "medium solid #000000"
        cellOne.style.borderLeft = "medium solid #000000"
        cellTwo.style.borderRight = "medium solid #000000"

     }
  }
 }

//want thin border on top of any total line
 function formatTotalLines(table) {
 var rows = document.getElementById(table).getElementsByTagName("tr")
 for (var i = 0; i < rows.length; i++) {
   var text = document.getElementById(table).getElementsByTagName("tr")[i].firstElementChild.innerHTML
   var textInUse = text.split(" ")
   var firstWord = textInUse[0]
  if (firstWord == "Total") {
    var row = document.getElementById(table).getElementsByTagName("tr")[i].getElementsByTagName("td")
   for (j=0; j < row.length; j++) {
     document.getElementById(table).getElementsByTagName("tr")[i].cells[j].style.borderTop = "1px solid #000000"
     }
    }
   }
  }


clearTable()
var answer = makeTable(printedWithTitles)
formatTable()
formatTotalLines("outputTable")
document.getElementById("goHere").appendChild(answer)

function populateSU(array) {
  var tableBody = document.getElementById('sourcesAndUsesTableBody')
    var rows = tableBody.getElementsByTagName('tr')
    for (var i = 0; i < rows.length; i++) {
          var row = tableBody.getElementsByTagName('tr')[i]
          var cell = document.createElement('td');
             cell.textContent = array[i];
             row.appendChild(cell);
   }
}

function clearSU() {
  var tableBody = document.getElementById('sourcesAndUsesTableBody')
    var rows = tableBody.getElementsByTagName('tr')
    for (var i = 0; i < rows.length; i++) {
          var row = tableBody.getElementsByTagName('tr')[i]
    for (j = row.childElementCount-1; j > 0; j--) {
        row.deleteCell(j)
      }
}
}

function populateMultiples(array) {
  var tableBody = document.getElementById('multiplesSummaryTableBody')
    var row1 = tableBody.getElementsByTagName('tr')[1]
    var cell1 = row1.getElementsByTagName('td')[1]
       cell1.textContent = array[0]
    var cell2 = row1.getElementsByTagName('td')[2]
      cell2.textContent = array[1]
    var row2 = tableBody.getElementsByTagName('tr')[2]
      var cell3 = row2.getElementsByTagName('td')[1]
         cell3.textContent = array[2]
      var cell4 = row2.getElementsByTagName('td')[2]
        cell4.textContent = array[3]
}

function populateCAGRs(array) {
  var tableBody = document.getElementById('CAGRSummaryTableBody')
    var row1 = tableBody.getElementsByTagName('tr')[0]
    var cell1 = row1.getElementsByTagName('td')[1]
       cell1.textContent = array[0]
    var row2 = tableBody.getElementsByTagName('tr')[1]
    var cell2 = row2.getElementsByTagName('td')[1]
      cell2.textContent = array[1]
    var row3 = tableBody.getElementsByTagName('tr')[2]
      var cell3 = row3.getElementsByTagName('td')[1]
         cell3.textContent = array[2]
}

var sandUArray = [Math.abs(purchasePrice), Math.abs(costs), UnlevereagedEntry, "", Math.abs(financingAmount), equityEntry, Math.abs(financingAmount) + equityEntry]
var presSandUArray = arrayDollarPresentation(sandUArray, presentationDecimals)
var presCAGRArray = [presEBITDACAGR, presUnleveragedCFsCAGR, presLeveragedCFsCAGR]
clearSU()
populateSU(presSandUArray)
formatTotalLines("sourcesAndUsesTable")

var presMultiplesArray = [presCurrentEntryMultiple, presExitMultiple, presForwardEntryMultiple, presImpliedForwardExitMultiple]
populateMultiples(presMultiplesArray)
populateCAGRs(presCAGRArray)
}

function scrollFunction(){
  var header = document.getElementsByTagName('header')[0]
  var intro = document.getElementById('intro')
    if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
      if (!header.hasAttribute("class"))
      header.setAttribute("class","shrink") //header.className = "shrink"
    if (intro != null)
       intro.remove()
    }  else {
      header.removeAttribute("class")  //header.removeAttribute("class") or classList.remove("shrink") or header.className = ""
      var newIntro = document.createElement('p')
      var text = document.createTextNode("An efficient way to check financial analysis")
      newIntro.appendChild(text)
      newIntro.setAttribute("id", "intro")
      header.appendChild(newIntro)
    }
    if (document.getElementsByTagName('header')[0].childElementCount > 2) {
      document.getElementsByTagName('header')[0].lastChild.remove()
    }
}

window.onscroll = function () {scrollFunction()}

function openPage(pageName) {
    var i;
    var x = document.getElementsByClassName("page");
    for (i = 0; i < x.length; i++) {
        x[i].style.display = "none";
    }
    document.getElementById(pageName).style.display = "block";
}

for (var i = 0 ; i < 3; i++) {
document.getElementsByClassName('Analysisselect')[i].onclick = function () {openPage("Analysis")}
document.getElementsByClassName('Aboutselect')[i].onclick = function () {openPage("About")}
document.getElementsByClassName('Improvementsselect')[i].onclick = function () {openPage("Improvements")}
}
