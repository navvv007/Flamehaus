"Could not load this order (HTTP 400)"  -  find out exactly what is being rejected
=================================================================================

1) Copy fe/OrderDetail.jsx to src/website/pages/OrderDetail.jsx   (frontend only, no restart needed)
   - If the public summary works, the order now LOADS anyway, with a yellow note that shows
     the technical detail of the request that failed.
   - If nothing works, the error box shows  METHOD URL -> HTTP status - start of the response body.

2) Run these two tests. In the browser on the order page press F12, open the Console tab, paste
   each line, press Enter, and send me what is printed.

   A) the logged-in customer request:
      fetch('/api/customer/orders/26',{headers:{Authorization:'Bearer '+localStorage.getItem('fh_customer_token')}}).then(async r=>console.log('A', r.status, await r.text()))

   B) the public request:
      fetch('/api/orders/26/track').then(async r=>console.log('B', r.status, await r.text()))

   Change 26 to your real order number.

3) Also look at the backend console at the moment you reload the page; any red line there is useful.
