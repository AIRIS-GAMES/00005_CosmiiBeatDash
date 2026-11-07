/* Home presentation only: keep existing buttons, handlers and accessible names. */
(() => {
  const asset='Asset/world/';
  const wordmark=document.querySelector('#home-header .wordmark');
  wordmark.innerHTML='<img class="home-title-art" src="'+asset+'title-arcade.png" alt="COSMII RHYTHM DASH">';
  const icon=(button,index)=>{
    if(!button||button.querySelector('.home-menu-icon'))return;
    const image=document.createElement('span');image.className='home-menu-icon';image.setAttribute('aria-hidden','true');
    image.style.backgroundPosition=`${index%3*50}% ${Math.floor(index/3)*100}%`;
    button.prepend(image);
  };
  function decorate(){
    const play=$('continue-btn').querySelector('span');
    if(play&&!play.querySelector('img'))play.innerHTML='<img src="'+asset+'play-icon.png" alt="">';
    icon($('missions-open'),0);icon($('more-open'),1);icon($('world-album-open'),2);
    ['help-open','social-open','games-open'].forEach((id,i)=>{
      const b=$(id);if(b.querySelector('.home-extra-icon'))return;
      const im=document.createElement('span');im.className='home-extra-icon';im.setAttribute('aria-hidden','true');im.style.backgroundPosition=`${i*50}% 50%`;b.prepend(im);
    });
    const profiles=$('world-profiles-open');
    if(!profiles.querySelector('img')){
      const img=document.createElement('img');img.className='home-profile-icon';img.src=asset+'cast-neon/red.png';img.alt='';profiles.prepend(img);
    }
    icon($('stageSelectBtn'),4);icon($('dailybtn'),5);
    document.querySelectorAll('#grid .tile').forEach((tile,i)=>{
      const theme=cosmiiWorld.themeFor(i);
      tile.title=`STAGE ${i+1} · ${theme.name}`;
      tile.style.backgroundImage=`linear-gradient(#080b3260,#080b32b0),url("${asset+theme.file}")`;
      tile.style.backgroundSize='cover';tile.style.backgroundPosition='center';
    });
  }
  const refresh=gameUI.refresh;gameUI.refresh=()=>{refresh();decorate();};decorate();
})();
