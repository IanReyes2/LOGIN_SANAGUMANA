"use client";

import { useEffect, useState } from "react";

type Order = {
  id: number;
  items: { name: string; price: number }[];
  total: number;
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    // 1️⃣ Initial fetch of existing orders (in case dashboard loads late)
    const fetchOrders = async () => {
      try {
        const res = await fetch("http://192.168.1.50:3001/api/order");
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    };
    fetchOrders();

    // 2️⃣ Setup WebSocket connection
    const socket = new WebSocket("ws://192.168.1.50:3001");

    socket.onopen = () => {
      console.log("✅ WebSocket connected to backend");
    };

    socket.onmessage = (event) => {
      try {
        const newOrder = JSON.parse(event.data);
        console.log("📥 New order received:", newOrder);

        // Append new order to existing orders
        setOrders((prevOrders) => [...prevOrders, newOrder]);
      } catch (err) {
        console.error("❌ Error parsing WebSocket message:", err);
      }
    };

    socket.onerror = (err) => {
      console.error("❌ WebSocket error:", err);
    };

    socket.onclose = () => {
      console.log("⚠️ WebSocket connection closed");
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <>
      {/* 🔹 Navbar */}
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start rtl:justify-end">
              <button
                data-drawer-target="logo-sidebar"
                data-drawer-toggle="logo-sidebar"
                aria-controls="logo-sidebar"
                type="button"
                className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
              >
                <span className="sr-only">Open sidebar</span>
                <svg
                  className="w-6 h-6"
                  aria-hidden="true"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5.25c0-.414.336-.75.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm.75 4.5a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <a href="#" className="flex ms-2 md:me-24">
                <span className="self-center text-xl font-semibold sm:text-2xl whitespace-nowrap dark:text-white">
                  The FrancisCanteen
                </span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* 🔹 Sidebar */}
      <aside
        id="logo-sidebar"
        className="fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform -translate-x-full bg-red-900 border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700"
        aria-label="Sidebar"
      >
        <div className="h-full px-3 pb-4 overflow-y-auto bg-red-900 dark:bg-gray-800">
          <ul className="space-y-2 font-medium">
            <li>
              <a
                href="#"
                className="flex items-center p-2 text-white rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <span className="ms-3">Transaction History</span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center p-2 text-white rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <span className="ms-3">Users</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      {/* 🔹 Main Content */}
      <main className="sm:ml-64">
        <section className="text-gray-600 body-font">
          <div className="container px-5 py-20 mx-auto">
            <h2 className="text-2xl font-bold mb-6">Incoming Orders</h2>
            <div className="flex flex-wrap -m-4">
              {orders.length === 0 ? (
                <p>No orders yet...</p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="p-4 lg:w-1/3 md:w-1/2 w-full">
                    <div className="h-full p-6 rounded-lg border-2 border-gray-200 flex flex-col relative overflow-hidden bg-white">
                      <h3 className="text-lg font-medium mb-2">
                        Order #{order.id}
                      </h3>
                      <ul className="mb-4">
                        {order.items.map((item, idx) => (
                          <li key={idx}>
                            {item.name} - ₱{item.price}
                          </li>
                        ))}
                      </ul>
                      <p className="font-bold mb-4">Total: ₱{order.total}</p>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="mt-auto bg-red-900 text-white px-4 py-2 rounded-lg"
                      >
                        Manage this Order
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 🔹 Side Panel for Managing Order */}
      {selectedOrder && (
        <div className="fixed top-0 right-0 w-96 h-full bg-white shadow-lg p-6 overflow-y-auto z-50">
          <button
            onClick={() => setSelectedOrder(null)}
            className="text-gray-500 hover:text-gray-700 mb-4"
          >
            Close
          </button>
          <h3 className="text-xl font-bold mb-4">
            Managing Order #{selectedOrder.id}
          </h3>
          <ul className="mb-4">
            {selectedOrder.items.map((item, idx) => (
              <li key={idx}>
                {item.name} - ₱{item.price}
              </li>
            ))}
          </ul>
          <p className="font-bold">Total: ₱{selectedOrder.total}</p>
        </div>
      )}
    </>
  );
}
