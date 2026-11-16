FIX:  GET /api/orders/undefined/track -> HTTP 400
==================================================
CAUSE
  The order page read the order number from the URL as  orderId,  but the route in App.jsx
  names that parameter differently (most likely  :id ), so the page got  undefined  and
  asked the server for order "undefined". The server cannot turn that into a number -> 400.

WHAT TO COPY (frontend only, no backend restart needed)
  fe/OrderDetail.jsx          -> src/website/pages/OrderDetail.jsx
  fe/DeliveryOrderDetail.jsx  -> src/delivery/pages/DeliveryOrderDetail.jsx

  Both now accept the parameter under either name (:orderId or :id / :assignmentId or :id),
  fall back to reading the number out of the URL, and refuse to call the server if the number
  is missing or not numeric (they show a clear message instead).

ADMIN ORDER PAGE - same protection, one line  (I did not have that file to hand)
  In src/admin/pages/AdminOrderDetail.jsx, find:
      const { orderId } = useParams();
  and replace it with:
      const params = useParams();
      const orderId = params.orderId ?? params.id;

OPTIONAL TIDY-UP
  In src/App.jsx, look at your customer order route, e.g.
      <Route path="orders/:id" element={<OrderDetail />} />
  Changing it to  orders/:orderId  is optional now - the page works with either name.

TEST
  Pay for an order, let it redirect to /orders/<number>. The order should load, with the timeline,
  address, partner and (for a cancelled order) the refund card.
