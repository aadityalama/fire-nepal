// Script to fill the expense form and trigger validation
(function() {
  console.log("=== Starting Expense Form Fill Script ===");
  
  // Find the expense name input
  const nameInput = document.querySelector('input[placeholder*="Internet"]') || 
                    document.querySelector('input[type="text"]');
  if (nameInput) {
    console.log("Found name input:", nameInput);
    nameInput.value = "Test Internet";
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log("Set name to: Test Internet");
  } else {
    console.log("Name input not found");
  }
  
  // Find the amount input
  const amountInput = document.querySelector('input[placeholder*="1,200"]') ||
                     document.querySelector('input[type="number"]');
  if (amountInput) {
    console.log("Found amount input:", amountInput);
    amountInput.value = "1500";
    amountInput.dispatchEvent(new Event('input', { bubbles: true }));
    amountInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log("Set amount to: 1500");
  } else {
    console.log("Amount input not found");
  }
  
  // Check button state
  setTimeout(() => {
    const saveButtons = document.querySelectorAll('button');
    console.log("=== All buttons on page ===");
    saveButtons.forEach((btn, idx) => {
      console.log(`Button ${idx}:`, btn.textContent.trim(), "disabled:", btn.disabled, "classes:", btn.className);
    });
  }, 500);
})();
