/* 
 * using formula from https://www.subsystems.us/uploads/9/8/9/4/98948044/moonphase.pdf
 */

function getMoonPhase(year, month, day)
{
    var data = {};
    // var c = e = jd = b = 0;

    if (month < 3) {
        year--;
        month += 12;
    }
    // console.log(year, month)
    var a = parseInt(year/100);
    // console.log(a);
    var b = parseInt(a/4);
    // console.log(b);    
    var c = 2-a+b;
    // console.log(c);
    var e = parseInt(365.25 * (year+4716));
    // console.log(e);
    var f = parseInt(30.6001*(month+1));
    // console.log(f);
    var totalJulianDays = c+day+e+f-1524.5;
    // console.log(totalJulianDays);
    var daysSinceNew= totalJulianDays-2451549.5;
    // console.log(daysSinceNew);
    var newMoons = daysSinceNew/ 29.53;
    // console.log(newMoons)
    var moonAgeDays = Math.round((newMoons-parseInt(newMoons))*29.53);
    var moonPhase = Math.round((newMoons-parseInt(newMoons))*8);
    // console.log(moonAgeDays, moonPhase); 

    // 0 => New Moon
    // 1 => Waxing Crescent Moon
    // 2 => Quarter Moon
    // 3 => Waxing Gibbous Moon
    // 4 => Full Moon
    // 5 => Waning Gibbous Moon
    // 6 => Last Quarter Moon
    // 7 => Waning Crescent Moon
    
    return {yyyy: year, mm: month, dd: day, moonPhase: moonPhase, moonAgeDays: moonAgeDays};
}