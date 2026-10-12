<div class="main-content-wrapper">
    <div class="apply-page book-container position-relative">
      <div class="row">
        <div class="col-lg-6 col-sm-12 px-5 text-center text-white position-relative">
          <div class="position-relative pt-lg-5 mt-lg-5 mx-xl-5 px-xl-5">
            <?php print $messages; ?>
            <?php if (!empty($tabs)): ?>
              <?php print render($tabs); ?>
            <?php endif; ?>
            <?php if (!empty($page['help'])): ?>
              <div class="well"><?php print render($page['help']); ?></div>
            <?php endif; ?>
            <?php if (!empty($action_links)): ?>
              <ul class="action-links"><?php print render($action_links); ?></ul>
            <?php endif; ?>

            <div id="content-inner">
              <?php print render($page['content']); ?>
            </div>
          </div>
        </div>
        <div class="col-lg-6 col-sm-12 position-relative mt-5">
          <div class="py-lg-5 my-lg-5 mx-5 px-5 py-5 bg-white">
            <?php
              $block = module_invoke('entityform_block', 'block_view', 'apply_now');
              print $block['content'];
            ?>
          </div>
        </div>
      </div>
    </div>
</div>
