/*
 * Astrion Browser — Tabbed lightweight browser for Astrion OS
 *
 * Fast WebKitGTK browser with:
 * - Multiple tabs (Ctrl+T new, Ctrl+W close)
 * - Dark theme matching Astrion OS
 * - URL bar, back/forward/reload per tab
 * - Persistent cookies + localStorage
 *
 * Usage: astrion-browser [URL]
 * Build: gcc -o astrion-browser astrion-browser.c $(pkg-config --cflags --libs gtk+-3.0 webkit2gtk-4.0)
 */

#include <gtk/gtk.h>
#include <webkit2/webkit2.h>
#include <string.h>
#include <stdlib.h>

#define MAX_TABS 20
#define HOME_URL "https://www.google.com"

typedef struct {
    GtkWidget *box;        /* vbox: url bar + webview */
    GtkWidget *url_entry;
    GtkWidget *back_btn;
    GtkWidget *fwd_btn;
    WebKitWebView *webview;
    GtkWidget *tab_label;
} BrowserTab;

static GtkWidget *window = NULL;
static GtkWidget *notebook = NULL;
static WebKitWebContext *web_context = NULL;
static BrowserTab tabs[MAX_TABS];
static int tab_count = 0;

/* ── Get current tab ── */
static BrowserTab* current_tab(void)
{
    int page = gtk_notebook_get_current_page(GTK_NOTEBOOK(notebook));
    if (page < 0 || page >= tab_count) return NULL;
    return &tabs[page];
}

/* ── URL bar submit ── */
static void on_url_activate(GtkEntry *entry, gpointer data)
{
    BrowserTab *tab = (BrowserTab *)data;
    const gchar *text = gtk_entry_get_text(entry);
    if (!text || !*text) return;

    gchar *url;
    if (g_str_has_prefix(text, "http://") || g_str_has_prefix(text, "https://")) {
        url = g_strdup(text);
    } else if (strchr(text, '.') && !strchr(text, ' ')) {
        url = g_strdup_printf("https://%s", text);
    } else {
        url = g_strdup_printf("https://www.google.com/search?q=%s", text);
    }

    webkit_web_view_load_uri(tab->webview, url);
    g_free(url);
}

/* ── Update URL bar ── */
static void on_uri_changed(WebKitWebView *view, GParamSpec *pspec, gpointer data)
{
    BrowserTab *tab = (BrowserTab *)data;
    const gchar *uri = webkit_web_view_get_uri(view);
    if (uri && tab->url_entry) {
        gtk_entry_set_text(GTK_ENTRY(tab->url_entry), uri);
    }
}

/* ── Update tab title ── */
static void on_title_changed(WebKitWebView *view, GParamSpec *pspec, gpointer data)
{
    BrowserTab *tab = (BrowserTab *)data;
    const gchar *title = webkit_web_view_get_title(view);
    if (title && *title) {
        /* Truncate to 20 chars for tab label */
        gchar *short_title = g_strndup(title, 20);
        gtk_label_set_text(GTK_LABEL(tab->tab_label), short_title);
        g_free(short_title);

        /* Full title in window */
        gchar *full = g_strdup_printf("%s — Astrion", title);
        gtk_window_set_title(GTK_WINDOW(window), full);
        g_free(full);
    }
}

/* ── Update nav buttons ── */
static void on_load_changed(WebKitWebView *view, WebKitLoadEvent event, gpointer data)
{
    BrowserTab *tab = (BrowserTab *)data;
    gtk_widget_set_sensitive(tab->back_btn, webkit_web_view_can_go_back(view));
    gtk_widget_set_sensitive(tab->fwd_btn, webkit_web_view_can_go_forward(view));
}

/* ── New window → open in same tab ── */
static GtkWidget* on_create(WebKitWebView *view, WebKitNavigationAction *action, gpointer data)
{
    WebKitURIRequest *req = webkit_navigation_action_get_request(action);
    webkit_web_view_load_request(view, req);
    return NULL;
}

/* ── Create a new tab ── */
static void new_tab(const char *url)
{
    if (tab_count >= MAX_TABS) return;

    BrowserTab *tab = &tabs[tab_count];

    /* Tab content: toolbar + webview */
    tab->box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);

    /* Toolbar */
    GtkWidget *toolbar = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 4);
    gtk_widget_set_margin_start(toolbar, 8);
    gtk_widget_set_margin_end(toolbar, 8);
    gtk_widget_set_margin_top(toolbar, 4);
    gtk_widget_set_margin_bottom(toolbar, 4);

    tab->back_btn = gtk_button_new_with_label("\u25C0");
    tab->fwd_btn = gtk_button_new_with_label("\u25B6");
    GtkWidget *reload_btn = gtk_button_new_with_label("\u21BB");

    gtk_widget_set_sensitive(tab->back_btn, FALSE);
    gtk_widget_set_sensitive(tab->fwd_btn, FALSE);

    tab->url_entry = gtk_entry_new();
    gtk_entry_set_text(GTK_ENTRY(tab->url_entry), url ? url : HOME_URL);
    gtk_entry_set_placeholder_text(GTK_ENTRY(tab->url_entry), "Search or enter URL...");

    gtk_box_pack_start(GTK_BOX(toolbar), tab->back_btn, FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(toolbar), tab->fwd_btn, FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(toolbar), reload_btn, FALSE, FALSE, 0);
    gtk_box_pack_start(GTK_BOX(toolbar), tab->url_entry, TRUE, TRUE, 0);

    gtk_box_pack_start(GTK_BOX(tab->box), toolbar, FALSE, FALSE, 0);

    /* WebView */
    WebKitSettings *settings = webkit_settings_new();
    webkit_settings_set_enable_javascript(settings, TRUE);
    webkit_settings_set_enable_html5_database(settings, TRUE);
    webkit_settings_set_enable_html5_local_storage(settings, TRUE);
    webkit_settings_set_enable_smooth_scrolling(settings, TRUE);
    webkit_settings_set_enable_webgl(settings, TRUE);
    webkit_settings_set_enable_media_stream(settings, TRUE);
    webkit_settings_set_enable_webaudio(settings, TRUE);
    webkit_settings_set_javascript_can_access_clipboard(settings, TRUE);
    webkit_settings_set_hardware_acceleration_policy(settings,
        WEBKIT_HARDWARE_ACCELERATION_POLICY_ALWAYS);
    webkit_settings_set_user_agent(settings,
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
        "AstrionBrowser/1.0 Safari/537.36");

    tab->webview = WEBKIT_WEB_VIEW(g_object_new(WEBKIT_TYPE_WEB_VIEW,
        "settings", settings,
        "web-context", web_context,
        NULL));

    /* HiDPI zoom from config */
    gchar *zoom_path = g_build_filename(g_get_home_dir(), ".config", "nova-renderer", "zoom", NULL);
    FILE *zf = fopen(zoom_path, "r");
    if (zf) {
        char buf[32];
        if (fgets(buf, sizeof(buf), zf)) {
            double z = atof(buf);
            if (z > 0) webkit_web_view_set_zoom_level(tab->webview, z);
        }
        fclose(zf);
    }
    g_free(zoom_path);

    gtk_box_pack_start(GTK_BOX(tab->box), GTK_WIDGET(tab->webview), TRUE, TRUE, 0);

    /* Tab label */
    tab->tab_label = gtk_label_new("New Tab");
    gtk_label_set_max_width_chars(GTK_LABEL(tab->tab_label), 20);
    gtk_label_set_ellipsize(GTK_LABEL(tab->tab_label), PANGO_ELLIPSIZE_END);

    /* Connect signals */
    g_signal_connect(tab->url_entry, "activate", G_CALLBACK(on_url_activate), tab);
    g_signal_connect(tab->webview, "notify::uri", G_CALLBACK(on_uri_changed), tab);
    g_signal_connect(tab->webview, "notify::title", G_CALLBACK(on_title_changed), tab);
    g_signal_connect(tab->webview, "load-changed", G_CALLBACK(on_load_changed), tab);
    g_signal_connect(tab->webview, "create", G_CALLBACK(on_create), tab);
    g_signal_connect_swapped(tab->back_btn, "clicked", G_CALLBACK(webkit_web_view_go_back), tab->webview);
    g_signal_connect_swapped(tab->fwd_btn, "clicked", G_CALLBACK(webkit_web_view_go_forward), tab->webview);
    g_signal_connect_swapped(reload_btn, "clicked", G_CALLBACK(webkit_web_view_reload), tab->webview);

    /* Add to notebook */
    gtk_widget_show_all(tab->box);
    int page = gtk_notebook_append_page(GTK_NOTEBOOK(notebook), tab->box, tab->tab_label);
    gtk_notebook_set_tab_reorderable(GTK_NOTEBOOK(notebook), tab->box, TRUE);
    gtk_notebook_set_current_page(GTK_NOTEBOOK(notebook), page);

    tab_count++;

    /* Load URL */
    webkit_web_view_load_uri(tab->webview, url ? url : HOME_URL);
}

/* ── Close current tab ── */
static void close_current_tab(void)
{
    int page = gtk_notebook_get_current_page(GTK_NOTEBOOK(notebook));
    if (page < 0 || tab_count <= 1) {
        gtk_widget_destroy(window);
        return;
    }

    gtk_notebook_remove_page(GTK_NOTEBOOK(notebook), page);

    /* Shift tabs array */
    for (int i = page; i < tab_count - 1; i++) {
        tabs[i] = tabs[i + 1];
    }
    tab_count--;
}

/* ── Keyboard shortcuts ── */
static gboolean on_key_press(GtkWidget *widget, GdkEventKey *event, gpointer data)
{
    gboolean ctrl = (event->state & GDK_CONTROL_MASK);

    /* Ctrl+T — new tab */
    if (ctrl && event->keyval == GDK_KEY_t) {
        new_tab(NULL);
        return TRUE;
    }
    /* Ctrl+W — close tab */
    if (ctrl && event->keyval == GDK_KEY_w) {
        close_current_tab();
        return TRUE;
    }
    /* Ctrl+L — focus URL bar */
    if (ctrl && event->keyval == GDK_KEY_l) {
        BrowserTab *tab = current_tab();
        if (tab) {
            gtk_widget_grab_focus(tab->url_entry);
            gtk_editable_select_region(GTK_EDITABLE(tab->url_entry), 0, -1);
        }
        return TRUE;
    }
    /* Ctrl+R / F5 — reload */
    if ((ctrl && event->keyval == GDK_KEY_r) || event->keyval == GDK_KEY_F5) {
        BrowserTab *tab = current_tab();
        if (tab) webkit_web_view_reload(tab->webview);
        return TRUE;
    }
    /* Ctrl+Tab — next tab */
    if (ctrl && event->keyval == GDK_KEY_Tab) {
        gtk_notebook_next_page(GTK_NOTEBOOK(notebook));
        return TRUE;
    }
    /* Ctrl+Shift+Tab — previous tab */
    if (ctrl && (event->state & GDK_SHIFT_MASK) && event->keyval == GDK_KEY_ISO_Left_Tab) {
        gtk_notebook_prev_page(GTK_NOTEBOOK(notebook));
        return TRUE;
    }
    /* Ctrl+Plus — zoom in */
    if (ctrl && (event->keyval == GDK_KEY_plus || event->keyval == GDK_KEY_equal)) {
        BrowserTab *tab = current_tab();
        if (tab) webkit_web_view_set_zoom_level(tab->webview,
            webkit_web_view_get_zoom_level(tab->webview) + 0.1);
        return TRUE;
    }
    /* Ctrl+Minus — zoom out */
    if (ctrl && event->keyval == GDK_KEY_minus) {
        BrowserTab *tab = current_tab();
        if (tab) webkit_web_view_set_zoom_level(tab->webview,
            webkit_web_view_get_zoom_level(tab->webview) - 0.1);
        return TRUE;
    }

    return FALSE;
}

/* ── Apply dark CSS ── */
static void apply_dark_theme(void)
{
    GtkCssProvider *css = gtk_css_provider_new();
    gtk_css_provider_load_from_data(css,
        "window, box, notebook, header { background-color: #1a1a22; color: #e0e0e0; }"
        "notebook tab { background: #2a2a34; border: none; padding: 6px 12px; color: #aaa; }"
        "notebook tab:checked { background: #3a3a48; color: #fff; }"
        "entry { background: #2a2a34; color: #fff; border: 1px solid #3a3a44; border-radius: 8px; padding: 6px 12px; }"
        "entry:focus { border-color: #007aff; }"
        "button { background: #2a2a34; color: #e0e0e0; border: 1px solid #3a3a44; border-radius: 6px; padding: 4px 8px; min-width: 28px; min-height: 28px; }"
        "button:hover { background: #3a3a48; }"
        , -1, NULL);

    gtk_style_context_add_provider_for_screen(
        gdk_screen_get_default(), GTK_STYLE_PROVIDER(css),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);
    g_object_unref(css);
}

int main(int argc, char *argv[])
{
    const char *initial_url = NULL;
    if (argc > 1 && argv[1][0] != '-') {
        initial_url = argv[1];
    }

    gtk_init(&argc, &argv);
    apply_dark_theme();

    /* Persistent data */
    const gchar *home = g_get_home_dir();
    gchar *data_dir = g_build_filename(home, ".local", "share", "astrion-browser", NULL);
    gchar *cache_dir = g_build_filename(home, ".cache", "astrion-browser", NULL);
    g_mkdir_with_parents(data_dir, 0755);
    g_mkdir_with_parents(cache_dir, 0755);

    WebKitWebsiteDataManager *dm = webkit_website_data_manager_new(
        "base-data-directory", data_dir,
        "base-cache-directory", cache_dir, NULL);
    web_context = webkit_web_context_new_with_website_data_manager(dm);

    WebKitCookieManager *cookies = webkit_web_context_get_cookie_manager(web_context);
    gchar *cookie_file = g_build_filename(data_dir, "cookies.sqlite", NULL);
    webkit_cookie_manager_set_persistent_storage(cookies, cookie_file,
        WEBKIT_COOKIE_PERSISTENT_STORAGE_SQLITE);
    g_free(cookie_file);
    g_free(data_dir);
    g_free(cache_dir);

    /* Window */
    window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(window), "Astrion Browser");
    gtk_window_set_default_size(GTK_WINDOW(window), 1200, 800);
    g_signal_connect(window, "destroy", G_CALLBACK(gtk_main_quit), NULL);
    g_signal_connect(window, "key-press-event", G_CALLBACK(on_key_press), NULL);

    /* Notebook (tabs) */
    notebook = gtk_notebook_new();
    gtk_notebook_set_scrollable(GTK_NOTEBOOK(notebook), TRUE);
    gtk_container_add(GTK_CONTAINER(window), notebook);

    /* Open first tab */
    new_tab(initial_url);

    gtk_widget_show_all(window);
    gtk_main();

    return 0;
}
