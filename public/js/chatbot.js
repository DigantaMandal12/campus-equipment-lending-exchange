"use strict";

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const form =
      document.getElementById(
        "assistantForm"
      );

    const input =
      document.getElementById(
        "assistantMessage"
      );

    const submit =
      document.getElementById(
        "assistantSubmit"
      );

    const messages =
      document.getElementById(
        "chatMessages"
      );

    const recommendationsSection =
      document.getElementById(
        "recommendationSection"
      );

    const recommendationGrid =
      document.getElementById(
        "recommendationGrid"
      );

    const noResultSection =
      document.getElementById(
        "noResultSection"
      );

    const characterCount =
      document.getElementById(
        "characterCount"
      );

    const chips =
      document.querySelectorAll(
        ".suggestion-chip"
      );


    // ================================================
    // CHARACTER COUNT
    // ================================================

    function updateCharacterCount() {

      if (!characterCount) {
        return;
      }

      characterCount.textContent =
        `${input.value.length} / 1000`;
    }

    input.addEventListener(
      "input",
      updateCharacterCount
    );

    updateCharacterCount();


    // ================================================
    // MESSAGE RENDERING
    // ================================================

    function appendMessage(
      role,
      text
    ) {

      const wrapper =
        document.createElement(
          "div"
        );

      wrapper.className =
        role === "user"
          ? "chat-message user-message"
          : "chat-message assistant-message";

      const label =
        document.createElement(
          "div"
        );

      label.className =
        "message-label";

      label.textContent =
        role === "user"
          ? "You"
          : "Assistant";

      const bubble =
        document.createElement(
          "div"
        );

      bubble.className =
        "message-bubble";

      bubble.textContent =
        text;

      wrapper.appendChild(
        label
      );

      wrapper.appendChild(
        bubble
      );

      messages.appendChild(
        wrapper
      );

      messages.scrollTop =
        messages.scrollHeight;
    }


    // ================================================
    // RECOMMENDATIONS
    // ================================================

    function renderRecommendations(
      recommendations
    ) {

      recommendationGrid.innerHTML =
        "";

      if (
        !Array.isArray(
          recommendations
        ) ||
        recommendations.length === 0
      ) {

        recommendationsSection.classList.add(
          "hidden"
        );

        noResultSection.classList.remove(
          "hidden"
        );

        return;
      }

      noResultSection.classList.add(
        "hidden"
      );

      recommendationsSection.classList.remove(
        "hidden"
      );


      for (
        const item of recommendations
      ) {

        const card =
          document.createElement(
            "article"
          );

        card.className =
          "recommendation-card";


        // IMAGE

        const imageContainer =
          document.createElement(
            "div"
          );

        imageContainer.className =
          "recommendation-image";


        if (
          Array.isArray(
            item.images
          ) &&
          item.images.length > 0 &&
          item.images[0]
        ) {

          const image =
            document.createElement(
              "img"
            );

          image.src =
            item.images[0];

          image.alt =
            item.name ||
            "Equipment";

          image.loading =
            "lazy";

          imageContainer.appendChild(
            image
          );

        } else {

          const placeholder =
            document.createElement(
              "div"
            );

          placeholder.className =
            "recommendation-placeholder";

          placeholder.textContent =
            item.name
              ? item.name
                  .charAt(0)
                  .toUpperCase()
              : "E";

          imageContainer.appendChild(
            placeholder
          );
        }


        // BODY

        const body =
          document.createElement(
            "div"
          );

        body.className =
          "recommendation-body";


        const category =
          document.createElement(
            "div"
          );

        category.className =
          "recommendation-category";

        category.textContent =
          item.category ||
          "Equipment";


        const title =
          document.createElement(
            "h3"
          );

        title.textContent =
          item.name ||
          "Equipment";


        const description =
          document.createElement(
            "p"
          );

        description.className =
          "recommendation-description";

        const rawDescription =
          item.description ||
          "No description available.";

        description.textContent =
          rawDescription.length > 120
            ? rawDescription.substring(
                0,
                120
              ) + "..."
            : rawDescription;


        // DETAILS

        const details =
          document.createElement(
            "div"
          );

        details.className =
          "recommendation-details";


        function addDetail(
          label,
          value
        ) {

          const wrapper =
            document.createElement(
              "div"
            );

          wrapper.className =
            "recommendation-detail";

          const small =
            document.createElement(
              "span"
            );

          small.textContent =
            label;

          const strong =
            document.createElement(
              "strong"
            );

          strong.textContent =
            value;

          wrapper.appendChild(
            small
          );

          wrapper.appendChild(
            strong
          );

          details.appendChild(
            wrapper
          );
        }


        addDetail(
          "Department",
          item.department ||
            "—"
        );

        addDetail(
          "Condition",
          item.condition ||
            "—"
        );

        addDetail(
          "Available",
          `${Number(
            item.availableQuantity || 0
          )} / ${Number(
            item.quantity || 0
          )}`
        );

        addDetail(
          "Rental Fee",
          `₹${Number(
            item.rentalFee || 0
          ).toLocaleString("en-IN")}`
        );


        // REASON

        const reason =
          document.createElement(
            "p"
          );

        reason.className =
          "recommendation-reason";

        reason.textContent =
          item.reason ||
          "This item matches your request.";


        // BUTTON

        const button =
          document.createElement(
            "a"
          );

        button.className =
          "recommendation-button";

        button.href =
          `/equipment/${encodeURIComponent(
            item._id
          )}`;

        button.textContent =
          "View & Borrow";


        body.appendChild(
          category
        );

        body.appendChild(
          title
        );

        body.appendChild(
          description
        );

        body.appendChild(
          details
        );

        body.appendChild(
          reason
        );

        body.appendChild(
          button
        );

        card.appendChild(
          imageContainer
        );

        card.appendChild(
          body
        );

        recommendationGrid.appendChild(
          card
        );
      }
    }


    // ================================================
    // SUBMIT
    // ================================================

    async function askAssistant(
      question
    ) {

      const cleanQuestion =
        String(
          question || ""
        ).trim();

      if (
        !cleanQuestion
      ) {

        return;
      }

      appendMessage(
        "user",
        cleanQuestion
      );

      submit.disabled =
        true;

      submit.textContent =
        "Thinking...";


      try {

        const response =
          await fetch(
            "/chatbot/ask",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  message:
                    cleanQuestion
                })
            }
          );


        let data;

        try {

          data =
            await response.json();

        } catch (
          error
        ) {

          throw new Error(
            "The server returned an invalid response."
          );
        }


        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
            "The assistant could not process your request."
          );
        }


        appendMessage(
          "assistant",
          data.response
        );

        renderRecommendations(
          data.recommendations
        );

        input.value =
          "";

        updateCharacterCount();

      } catch (
        error
      ) {

        appendMessage(
          "assistant",
          error.message ||
          "Something went wrong. Please try again."
        );

      } finally {

        submit.disabled =
          false;

        submit.textContent =
          "Ask Assistant";

        input.focus();
      }
    }


    // ================================================
    // FORM SUBMIT
    // ================================================

    form.addEventListener(
      "submit",
      (event) => {

        event.preventDefault();

        askAssistant(
          input.value
        );

      }
    );


    // ================================================
    // QUICK SUGGESTIONS
    // ================================================

    chips.forEach(
      (chip) => {

        chip.addEventListener(
          "click",
          () => {

            const question =
              chip.dataset.question ||
              "";

            input.value =
              question;

            updateCharacterCount();

            askAssistant(
              question
            );
          }
        );
      }
    );

  }
);