document.addEventListener("DOMContentLoaded", function () {
    const messages = document.querySelectorAll(".header-message-row [data-auto-hide='true']");

    messages.forEach((message) => {
        setTimeout(() => {
            message.classList.remove("show");

            message.addEventListener(
                "transitionend",
                () => {
                    message.classList.add("d-none");
                },
                { once: true }
            );
        }, 10000);
    });
});

function clearActiveMenuState() {
    document.querySelectorAll(".category-item, .child-item").forEach((item) => {
        item.classList.remove("is-active");
    });
}

function setActiveCategoryBySubmenu(submenu) {
    if (!submenu || !submenu.id) {
        return;
    }

    const categoryItem = document.querySelector(`.category-item[data-target="${submenu.id}"]`);
    if (categoryItem) {
        categoryItem.classList.add("is-active");
    }
}

function activateChildPath(childItem) {
    if (!childItem) {
        return;
    }

    clearActiveMenuState();

    const submenu = childItem.closest(".submenu");
    setActiveCategoryBySubmenu(submenu);
    childItem.classList.add("is-active");
}

document.querySelectorAll(".category-item").forEach(item => {
    item.addEventListener("mouseenter", function () {
        clearActiveMenuState();
        this.classList.add("is-active");

        document.querySelectorAll(".submenu").forEach(menu => {
            menu.classList.add("d-none");
        });

        const submenu = document.getElementById(this.dataset.target);
        if (submenu) {
            submenu.classList.remove("d-none");
        }
    });
});

document.querySelectorAll(".child-item").forEach((item) => {
    item.addEventListener("mouseenter", function () {
        activateChildPath(this);
    });
});

document.querySelectorAll(".grandchild-item").forEach((item) => {
    item.addEventListener("mouseenter", function () {
        activateChildPath(this.closest(".child-item"));
    });
});

const headerMainRow = document.querySelector(".header-main-row");

function setStickyHeaderHeight() {
    if (!headerMainRow) {
        return;
    }

    document.documentElement.style.setProperty(
        "--sticky-header-height",
        `${headerMainRow.offsetHeight}px`
    );
}

setStickyHeaderHeight();
window.addEventListener("resize", setStickyHeaderHeight);
