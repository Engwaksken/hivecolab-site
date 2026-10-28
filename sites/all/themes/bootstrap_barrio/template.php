<?php
/**
 * @file
 * template.php
 */

/**
 * Override or insert variables into the page template for HTML output.
 * 
 * For taxonomy page, insert vocabulary id class.
 * Define the variable to activate responsive behaivor.
 */
function bootstrap_barrio_preprocess_html(&$variables) {
  // Use Hive Colab's branded icon instead of the base theme's Drupal icon.
  $favicon = drupal_get_path('theme', 'bootstrap_barrio') . '/favicon.png';
  if (file_exists(DRUPAL_ROOT . '/' . $favicon)) {
    drupal_add_html_head_link(array(
      'rel' => 'icon',
      'type' => 'image/png',
      'href' => base_path() . $favicon . '?v=3',
    ), TRUE);
  }
  // Accessibility widget. The script runs in the header so saved display
  // settings apply before the page paints.
  $theme_path = drupal_get_path('theme', 'bootstrap_barrio');
  drupal_add_css($theme_path . '/css/a11y-widget.css', array('group' => CSS_THEME, 'every_page' => TRUE, 'weight' => 100));
  drupal_add_js($theme_path . '/js/a11y-widget.js', array('scope' => 'header', 'group' => JS_THEME, 'every_page' => TRUE));
  if (arg(0) == 'taxonomy') {
    $tid = arg(2);
    $taxonomy = taxonomy_term_load($tid);
    $variables['classes_array'][] = 'vid-' . $taxonomy->vid;
  }
  if (theme_get_setting('is_one') && drupal_is_front_page()) {
    $variables['classes_array'][] = 'one-page';
  }
  if (theme_get_setting('toggle_responsive')) {
    $variables['mobile_friendly'] = TRUE;
  }
  else {
    $variables['mobile_friendly'] = FALSE;
    drupal_add_css(drupal_get_path('theme', 'bootstrap_barrio') . '/css/no-responsive.css', array('group' => CSS_DEFAULT, 'every_page' => TRUE));
  }
}

/**
 * Ensure opportunity featured images appear on the full opportunity page.
 */
function bootstrap_barrio_preprocess_node(&$variables) {
  if ($variables['type'] !== 'opportunity' || empty($variables['page'])) {
    return;
  }

  $node = $variables['node'];
  if (empty($node->field_featured_image)) {
    return;
  }

  $image = field_view_field('node', $node, 'field_featured_image', array('label' => 'hidden'));
  if (!$image) {
    return;
  }

  $image['#prefix'] = '<div class="opportunity-hero-wrapper">';
  $image['#suffix'] = '</div>';
  $image['#weight'] = -100;
  $variables['content']['field_featured_image'] = $image;
}

/**
 * Override or insert variables into the page template for page output.
 *
 * Sets the widths of the main columns of the page.
 */
function bootstrap_barrio_preprocess_page(&$variables) {
  $variables['content_width'] = _bootstrap_barrio_content_width();
  $variables['sidebar_first_width'] = 'col-md-' . theme_get_setting('sidebar_first_width');
  $variables['sidebar_second_width'] = 'col-md-' . theme_get_setting('sidebar_second_width');
  if (theme_get_setting('is_one') && drupal_is_front_page()) {
    $variables['theme_hook_suggestions'][] = 'page__one';
  }
  if (theme_get_setting('collapse')) {
    $variables['collapse'] = 'collapse navbar-collapse';
  }
  else {
    $variables['collapse'] = 'not-collapse';
  }
  if (!theme_get_setting('print_content') && drupal_is_front_page()) {
    $variables['print_content'] = FALSE;
     if (module_exists('metatag')) {
      $variables['pagemetatag'] = metatag_metatags_view('global:frontpage');
    }
    else {
      $variables['pagemetatag'] = array();
    }
 }
  else {
    $variables['print_content'] = TRUE;
  }

  // List published opportunities below the hiring information on Careers.
  // This is added to the page content region rather than the node so Display
  // Suite layouts and node templates cannot drop it.
  $node = menu_get_object('node');
  if ($node && _bootstrap_barrio_is_careers_node($node) && isset($variables['page']['content'])) {
    $variables['page']['content']['careers_opportunities'] = _bootstrap_barrio_careers_opportunities();
  }
}

/**
 * Checks whether a node is the Careers page.
 */
function _bootstrap_barrio_is_careers_node($node) {
  if ($node->nid == 220) {
    return TRUE;
  }
  $alias = drupal_get_path_alias('node/' . $node->nid);
  return in_array(basename($alias), array('careers', 'career'), TRUE);
}

/**
 * Builds the Careers opportunities listing.
 *
 * Loads published opportunity nodes directly so uploaded opportunities show
 * up without depending on a particular Views display being configured.
 */
function _bootstrap_barrio_careers_opportunities() {
  $query = new EntityFieldQuery();
  $result = $query->entityCondition('entity_type', 'node')
    ->entityCondition('bundle', 'opportunity')
    ->propertyCondition('status', NODE_PUBLISHED)
    ->propertyOrderBy('sticky', 'DESC')
    ->propertyOrderBy('created', 'DESC')
    ->addTag('node_access')
    ->execute();

  $rows = array();
  if (!empty($result['node'])) {
    foreach (node_load_multiple(array_keys($result['node'])) as $opportunity) {
      if (!_bootstrap_barrio_opportunity_is_expired($opportunity)) {
        $rows[] = _bootstrap_barrio_opportunity_card($opportunity);
      }
    }
  }

  if ($rows) {
    $listing = '<div class="view view-opportunities"><div class="view-content">' . implode('', $rows) . '</div></div>';
  }
  else {
    $listing = '<p class="careers-opportunities-empty">' . t('There are no open opportunities right now. Please check back soon.') . '</p>';
  }

  return array(
    '#markup' => '<div class="careers-opportunities"><div class="careers-opportunities-header"><h2>' . t('Current Opportunities') . '</h2></div>' . $listing . '</div>',
    '#weight' => 100,
  );
}

/**
 * Checks whether an opportunity's application deadline has passed.
 *
 * Opportunities without a deadline are treated as open. A deadline stays
 * active until the end of that day in the site's timezone.
 */
function _bootstrap_barrio_opportunity_is_expired($node) {
  $items = field_get_items('node', $node, 'field_application_deadline');
  if (empty($items[0]['value'])) {
    return FALSE;
  }

  $item = $items[0];
  // Use the end date when the deadline is stored as a date range.
  $value = !empty($item['value2']) ? $item['value2'] : $item['value'];

  if (is_numeric($value)) {
    $deadline = (int) $value;
  }
  else {
    $timezone = !empty($item['timezone_db']) ? $item['timezone_db'] : 'UTC';
    try {
      $date = new DateTime($value, new DateTimeZone($timezone));
    }
    catch (Exception $e) {
      return FALSE;
    }
    $deadline = $date->getTimestamp();
  }

  // Compare by calendar day so a deadline of today is still listed.
  $deadline_day = format_date($deadline, 'custom', 'Y-m-d');
  $today = format_date(REQUEST_TIME, 'custom', 'Y-m-d');
  return $deadline_day < $today;
}

/**
 * Renders one opportunity card using the Opportunities view's markup.
 */
function _bootstrap_barrio_opportunity_card($node) {
  $uri = 'node/' . $node->nid;
  $card = '';

  // Always output the image area so cards without an image stay aligned.
  $image = '';
  if (!empty($node->field_featured_image)) {
    $field = field_view_field('node', $node, 'field_featured_image', array('label' => 'hidden', 'settings' => array('image_link' => 'content')));
    $image = drupal_render($field);
  }
  $card .= '<div class="views-field views-field-field-featured-image">' . $image . '</div>';

  if (!empty($node->field_category)) {
    $field = field_view_field('node', $node, 'field_category', array('label' => 'hidden'));
    $card .= '<div class="views-field views-field-field-category">' . drupal_render($field) . '</div>';
  }

  $card .= '<div class="views-field views-field-title">' . l($node->title, $uri) . '</div>';
  $card .= '<div class="views-field views-field-created">' . format_date($node->created, 'custom', 'j M Y') . '</div>';

  if (!empty($node->field_summary)) {
    $summary = field_view_field('node', $node, 'field_summary', array('label' => 'hidden'));
    $card .= '<div class="views-field views-field-field-summary">' . drupal_render($summary) . '</div>';
  }

  $card .= '<div class="views-field views-field-nothing">' . l(t('Read more'), $uri, array('attributes' => array('class' => array('opportunity-read-more')))) . '</div>';

  return '<div class="views-row">' . $card . '</div>';
}

/**
 * Returns with of content region.
 *
 * Calculates content width based on first and second column width parameters.
 */
function _bootstrap_barrio_content_width() {
  $sidebar_first_width = (_bootstrap_barrio_block_list('sidebar_first')) ? theme_get_setting('sidebar_first_width') : 0;
  $sidebar_second_width = (_bootstrap_barrio_block_list('sidebar_second')) ? theme_get_setting('sidebar_second_width') : 0;
  $content_width = 12 - $sidebar_first_width - $sidebar_second_width;
  $content_width = "col-md-" . $content_width;
  return $content_width;
}

/**
 * Returns a list of blocks.
 *
 * Uses Drupal block interface and appends any blocks 
 * assigned by the Context module.
 * Taken from Fusion Core.
 */
function _bootstrap_barrio_block_list($region) {
  $drupal_list = array();
  if (module_exists('block')) {
    $drupal_list = block_list($region);
  }
  if (module_exists('context') && $context = context_get_plugin('reaction', 'block')) {
    $context_list = $context->block_list($region);
    $drupal_list = array_merge($context_list, $drupal_list);
  }
  return $drupal_list;
}
