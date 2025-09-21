import React, { useState } from "react";
import CustomerSelection from "./CustomerSelection";
import ProductCatalogue from "./ProductCatalogue";
import toast from "react-hot-toast";

export default function PlaceOrderFlow() {
  const [currentStep, setCurrentStep] = useState("customer"); // "customer" or "products"
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCurrentStep("products");
    toast.success(`Selected customer: ${customer.name}`);
  };

  const handleBackToCustomerSelection = () => {
    setCurrentStep("customer");
  };

  const handleOrderPlaced = () => {
    // Reset the flow after successful order placement
    setCurrentStep("customer");
    setSelectedCustomer(null);
  };

  return (
    <div>
      {currentStep === "customer" ? (
        <CustomerSelection
          onCustomerSelect={handleCustomerSelect}
          selectedCustomer={selectedCustomer}
        />
      ) : (
        <ProductCatalogue
          selectedCustomer={selectedCustomer}
          onBack={handleBackToCustomerSelection}
          onOrderPlaced={handleOrderPlaced}
        />
      )}
    </div>
  );
}