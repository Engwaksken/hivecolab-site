<?php

/**
 * @file
 * Implement webpsupport for image field.
 */

/**
 * Implements hook_field_formatter_info_alter().
 */
function imagewebp_field_formatter_info_alter(array &$info) {
  // Add a setting to a formatter.
  $info['image']['settings'] += array(
    'webp_support' => FALSE,
  );
}

/**
 * Implements hook_field_formatter_settings_form().
 */
function imagewebp_field_formatter_settings_form_alter(&$settings_form, $context) {
  if ($context['instance']['display'][$context['view_mode']]['type'] == 'image') {
    $display = $context['instance']['display'][$context['view_mode']];
    $settings = $display['settings'];
    $settings_form['webp_support'] = array(
      '#type' => 'checkbox',
      '#title' => t('Webp support'),
      '#default_value' => $settings['webp_support'],
    );
  }
}

/**
 * Implements hook_field_formatter_settings_summary_alter().
 */
function imagewebp_field_formatter_settings_summary_alter(&$summary, $context) {
  // Append a message to the summary when image has
  // webpsupport set to TRUE for the current view mode.
  if ($context['instance']['display'][$context['view_mode']]['type'] == 'image') {

    $display = $context['instance']['display'][$context['view_mode']];
    $settings = $display['settings'];
    if (!empty($summary)) {
      $summary .= '<br />';
    }

    if ($settings['webp_support']) {
      $summary .= t('Webp support enabled.');
    }
  }
}
