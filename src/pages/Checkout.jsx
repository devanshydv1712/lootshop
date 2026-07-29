import React, { useState, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { clearCart } from '../redux/cartSlice';
import { BASE_URL } from '../constant';

const Checkout = () => {
  const { user } = useContext(AuthContext);
  const cartItems = useSelector((state) => state.cart.cartItems);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [address, setAddress] = useState({
    fullName: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
  });

  const totalPrice = cartItems.reduce(
    (acc, item) => acc + Number(item.price) * Number(item.qty),
    0
  );

  const handlePayment = async () => {
    try {
      const orderRes = await fetch(`${BASE_URL}/api/payment/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: totalPrice }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        const fallback = window.confirm(
          'Razorpay unavailable. Use Student Bypass Mode?'
        );

        if (fallback) {
          return bypassPayment();
        }

        return alert(orderData.message || 'Payment initialization failed');
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'LootShop',
        description: 'Order Payment',
        order_id: orderData.id,

        handler: async function (response) {
          try {
            const verifyRes = await fetch(`${BASE_URL}/api/payment/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();

            console.log('Verify Response:', verifyData);

            console.log("Verify Status:", verifyRes.status);

        

            if (!verifyRes.ok) {
              return alert(
                verifyData.message || 'Payment verification failed'
              );
            }

            const payload = {
              items: cartItems,
              totalAmount: totalPrice,
              address,
              paymentId: response.razorpay_payment_id,
            };

            console.log('Order Payload:', payload);
            console.log('User:', user);
            console.log('Token:', user?.token);
            console.log(cartItems);

            const saveOrderRes = await fetch(`${BASE_URL}/api/orders`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user.token}`,
              },
              body: JSON.stringify(payload),
            });

            const saveOrderData = await saveOrderRes.json();

            console.log('Order Response:', saveOrderData);

            if (!saveOrderRes.ok) {
              return alert(
                saveOrderData.message || 'Order saving failed'
              );
            }

            dispatch(clearCart());
            navigate('/ordersuccess');
          } catch (err) {
            console.error(err);
            alert('Something went wrong while placing order.');
          }
        },

        prefill: {
          name: address.fullName,
          email: user?.email,
          contact: '9999999999',
        },

        theme: {
          color: '#f97316',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error(error);
      alert('Payment failed.');
    }
  };

  const bypassPayment = async () => {
    try {
      const payload = {
        items: cartItems,
        totalAmount: totalPrice,
        address,
        paymentId: `bypass_${Date.now()}`,
      };

      console.log('Bypass Payload:', payload);

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      console.log('Bypass Response:', data);

      if (!res.ok) {
        return alert(data.message || 'Order saving failed');
      }

      dispatch(clearCart());
      navigate('/ordersuccess');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!user) {
      alert('Please login first');
      return navigate('/login');
    }

    handlePayment();
  };

  return (
    <div className="checkout-container">
      <h2>Checkout</h2>

      <div className="checkout-content">
        <form onSubmit={handleSubmit} className="shipping-form">
          <h3>Shipping Address</h3>

          <input
            type="text"
            placeholder="Full Name"
            required
            value={address.fullName}
            onChange={(e) =>
              setAddress({ ...address, fullName: e.target.value })
            }
          />

          <input
            type="text"
            placeholder="Street"
            required
            value={address.street}
            onChange={(e) =>
              setAddress({ ...address, street: e.target.value })
            }
          />

          <input
            type="text"
            placeholder="City"
            required
            value={address.city}
            onChange={(e) =>
              setAddress({ ...address, city: e.target.value })
            }
          />

          <input
            type="text"
            placeholder="Postal Code"
            required
            value={address.postalCode}
            onChange={(e) =>
              setAddress({
                ...address,
                postalCode: e.target.value,
              })
            }
          />

          <input
            type="text"
            placeholder="Country"
            required
            value={address.country}
            onChange={(e) =>
              setAddress({
                ...address,
                country: e.target.value,
              })
            }
          />

          <div className="checkout-summary">
            <h4>Total to Pay: ₹{totalPrice.toFixed(2)}</h4>

            <button type="submit" className="btn">
              Pay Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;