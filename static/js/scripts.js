document.querySelectorAll(".category-item").forEach(item => {

    item.addEventListener("mouseenter", function () {

        document.querySelectorAll(".submenu").forEach(menu => {
            menu.classList.add("d-none");
        });

        document
            .getElementById(this.dataset.target)
            .classList.remove("d-none");

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
